package main

import (
	"context"
	"log"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"github.com/SecurityByDesign/pwmanager/internal/config"
)

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

	// Connect to PostgreSQL
	db, err := sqlx.Connect("postgres", cfg.Database.URL)
	if err != nil {
		logger.Fatal("Failed to connect to database", zap.Error(err))
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
}
