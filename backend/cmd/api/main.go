package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"github.com/SecurityByDesign/pwmanager/internal/auth"
	"github.com/SecurityByDesign/pwmanager/internal/config"
	"github.com/SecurityByDesign/pwmanager/internal/handlers"
	"github.com/SecurityByDesign/pwmanager/internal/middleware"
	"github.com/SecurityByDesign/pwmanager/internal/repository"
	"github.com/SecurityByDesign/pwmanager/pkg/crypto"

	_ "github.com/SecurityByDesign/pwmanager/docs" // Import generated docs
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// @title           Password Manager API
// @version         1.0
// @description     A secure password manager API with encryption and audit logging.
// @termsOfService  http://swagger.io/terms/

// @contact.name    API Support
// @contact.url     http://www.swagger.io/support
// @contact.email   support@swagger.io

// @license.name    Apache 2.0
// @license.url     http://www.apache.org/licenses/LICENSE-2.0.html

// @host            localhost:8080
// @BasePath        /api
// @schemes         http https

// @securityDefinitions.apikey ApiKeyAuth
// @in header
// @name Authorization
func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Initialize logger
	var logger *zap.Logger
	if cfg.IsDevelopment() {
		logger, err = zap.NewDevelopment()
	} else {
		logger, err = zap.NewProduction()
	}
	if err != nil {
		log.Fatalf("Failed to initialize logger: %v", err)
	}
	defer func() {
		_ = logger.Sync()
	}()

	logger.Info("Starting Password Manager API Server",
		zap.String("env", cfg.Server.Env),
		zap.String("port", cfg.Server.Port),
	)

	// Connect to PostgreSQL with retry
	var db *sqlx.DB
	for i := 0; i < 30; i++ {
		db, err = sqlx.Connect("postgres", cfg.Database.URL)
		if err == nil {
			break
		}
		logger.Warn("Failed to connect to database, retrying in 2 seconds...", zap.Error(err))
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		logger.Fatal("Failed to connect to database after multiple retries", zap.Error(err))
	}
	defer db.Close()

	// Test database connection
	if err := db.Ping(); err != nil {
		logger.Fatal("Failed to ping database", zap.Error(err))
	}
	logger.Info("Connected to PostgreSQL database")

	// Connect to Redis
	redisOpts, err := redis.ParseURL(cfg.Redis.URL)
	if err != nil {
		logger.Fatal("Failed to parse Redis URL", zap.Error(err))
	}
	redisClient := redis.NewClient(redisOpts)
	defer redisClient.Close()

	// Test Redis connection
	ctx := context.Background()
	if err := redisClient.Ping(ctx).Err(); err != nil {
		logger.Fatal("Failed to connect to Redis", zap.Error(err))
	}
	logger.Info("Connected to Redis")

	// Initialize repositories
	userRepo := repository.NewUserRepository(db)
	vaultRepo := repository.NewVaultRepository(db)
	entryRepo := repository.NewEntryRepository(db)
	auditRepo := repository.NewAuditRepository(db)
	mfaRepo := repository.NewMFARepository(db)

	// Initialize session manager
	sessionManager := auth.NewSessionManager(
		redisClient,
		time.Duration(cfg.Session.MaxAge)*time.Second,
		time.Duration(cfg.Session.IdleTimeout)*time.Second,
	)

	// Initialize Argon2 parameters
	argon2Params := &crypto.Argon2Params{
		Memory:      cfg.Argon2.Memory,
		Iterations:  cfg.Argon2.Iterations,
		Parallelism: cfg.Argon2.Parallelism,
		SaltLength:  cfg.Argon2.SaltLength,
		KeyLength:   cfg.Argon2.KeyLength,
	}

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(userRepo, mfaRepo, auditRepo, sessionManager, argon2Params, cfg.Security.MasterEncryptionKey, logger)
	vaultHandler := handlers.NewVaultHandler(vaultRepo, entryRepo, auditRepo, logger)
	entryHandler := handlers.NewEntryHandler(entryRepo, vaultRepo, auditRepo, logger)
	auditHandler := handlers.NewAuditHandler(auditRepo, logger)

	// Setup Gin
	gin.SetMode(cfg.Server.GinMode)
	router := gin.New()

	// Global middleware
	router.Use(middleware.RecoveryMiddleware(logger))
	router.Use(middleware.LoggingMiddleware(logger))
	router.Use(middleware.CORSMiddleware(cfg.CORS.AllowedOrigins))

	// Swagger Documentation
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "timestamp": time.Now().Unix()})
	})

	// API routes
	api := router.Group("/api")
	{
		// Auth routes (public)
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/logout", middleware.AuthMiddleware(sessionManager), authHandler.Logout)
			auth.POST("/change-password", middleware.AuthMiddleware(sessionManager), authHandler.ChangePassword)
			auth.GET("/me", middleware.AuthMiddleware(sessionManager), authHandler.Me)

			// MFA routes (protected)
			auth.POST("/mfa/setup", middleware.AuthMiddleware(sessionManager), authHandler.SetupMFA)
			auth.POST("/mfa/verify", middleware.AuthMiddleware(sessionManager), authHandler.VerifyMFA)
			auth.POST("/mfa/disable", middleware.AuthMiddleware(sessionManager), authHandler.DisableMFA)
		}

		// Protected routes
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware(sessionManager))
		{
			// Vault routes
			vaults := protected.Group("/vaults")
			{
				vaults.GET("", vaultHandler.List)
				vaults.POST("", vaultHandler.Create)
				vaults.GET("/:id", vaultHandler.Get)
				vaults.PUT("/:id", vaultHandler.Update)
				vaults.DELETE("/:id", vaultHandler.Delete)

				// Entry routes nested under vaults
				vaults.POST("/:id/entries", entryHandler.Create)
				vaults.GET("/:id/entries", entryHandler.List)
			}

			// Entry routes (by ID)
			entries := protected.Group("/entries")
			{
				entries.GET("/:id", entryHandler.Get)
				entries.PUT("/:id", entryHandler.Update)
				entries.DELETE("/:id", entryHandler.Delete)
			}

			// Audit routes
			audit := protected.Group("/audit")
			{
				audit.GET("/logs", auditHandler.List)
				audit.GET("/logs/:id", auditHandler.Get)
			}
		}
	}

	// Start server with graceful shutdown
	addr := fmt.Sprintf(":%s", cfg.Server.Port)
	logger.Info("Server listening", zap.String("address", addr))

	// Create server
	srv := &http.Server{
		Addr:    addr,
		Handler: router,
	}

	// Start server in goroutine
	go func() {
		var err error
		if cfg.TLS.Enabled {
			logger.Info("Starting HTTPS server")
			err = srv.ListenAndServeTLS(cfg.TLS.CertPath, cfg.TLS.KeyPath)
		} else {
			logger.Info("Starting HTTP server")
			err = srv.ListenAndServe()
		}

		if err != nil && err != http.ErrServerClosed {
			logger.Fatal("Server failed to start", zap.Error(err))
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")

	// Graceful shutdown with 5 second timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal("Server forced to shutdown", zap.Error(err))
	}

	logger.Info("Server exited")
}
