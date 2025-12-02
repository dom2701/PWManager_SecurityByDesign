package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config holds all configuration for the application
type Config struct {
	Server    ServerConfig
	Database  DatabaseConfig
	Redis     RedisConfig
	Security  SecurityConfig
	Session   SessionConfig
	RateLimit RateLimitConfig
	CORS      CORSConfig
	TLS       TLSConfig
	Argon2    Argon2Config
	Logging   LoggingConfig
}

// ServerConfig holds server-specific configuration
type ServerConfig struct {
	Port    string
	Env     string
	GinMode string
}

// DatabaseConfig holds database connection configuration
type DatabaseConfig struct {
	URL string
}

// RedisConfig holds Redis connection configuration
type RedisConfig struct {
	URL string
}

// SecurityConfig holds security-related configuration
type SecurityConfig struct {
	SessionSecret       string
	MasterEncryptionKey string
}

// SessionConfig holds session management configuration
type SessionConfig struct {
	MaxAge      int // in seconds
	IdleTimeout int // in seconds
}

// RateLimitConfig holds rate limiting configuration
type RateLimitConfig struct {
	RequestsPerMinute int
}

// CORSConfig holds CORS configuration
type CORSConfig struct {
	AllowedOrigins string
}

// TLSConfig holds TLS configuration
type TLSConfig struct {
	Enabled  bool
	CertPath string
	KeyPath  string
}

// Argon2Config holds Argon2id hashing parameters
type Argon2Config struct {
	Memory      uint32
	Iterations  uint32
	Parallelism uint8
	SaltLength  uint32
	KeyLength   uint32
}

// LoggingConfig holds logging configuration
type LoggingConfig struct {
	Level string
}

// Load loads configuration from environment variables
func Load() (*Config, error) {
	// Load .env file if it exists (ignore error in production)
	_ = godotenv.Load()

	cfg := &Config{
		Server: ServerConfig{
			Port:    getEnv("PORT", "8080"),
			Env:     getEnv("ENV", "development"),
			GinMode: getEnv("GIN_MODE", "debug"),
		},
		Database: DatabaseConfig{
			URL: getEnv("DATABASE_URL", ""),
		},
		Redis: RedisConfig{
			URL: getEnv("REDIS_URL", ""),
		},
		Security: SecurityConfig{
			SessionSecret:       getEnv("SESSION_SECRET", ""),
			MasterEncryptionKey: getEnv("MASTER_ENCRYPTION_KEY", ""),
		},
		Session: SessionConfig{
			MaxAge:      getEnvAsInt("SESSION_MAX_AGE", 3600),
			IdleTimeout: getEnvAsInt("SESSION_IDLE_TIMEOUT", 1800),
		},
		RateLimit: RateLimitConfig{
			RequestsPerMinute: getEnvAsInt("RATE_LIMIT_REQUESTS_PER_MINUTE", 60),
		},
		CORS: CORSConfig{
			AllowedOrigins: getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000"),
		},
		TLS: TLSConfig{
			Enabled:  getEnvAsBool("TLS_ENABLED", false),
			CertPath: getEnv("TLS_CERT_PATH", ""),
			KeyPath:  getEnv("TLS_KEY_PATH", ""),
		},
		Argon2: Argon2Config{
			Memory:      uint32(getEnvAsInt("ARGON2_MEMORY", 65536)),
			Iterations:  uint32(getEnvAsInt("ARGON2_ITERATIONS", 3)),
			Parallelism: uint8(getEnvAsInt("ARGON2_PARALLELISM", 4)),
			SaltLength:  uint32(getEnvAsInt("ARGON2_SALT_LENGTH", 16)),
			KeyLength:   uint32(getEnvAsInt("ARGON2_KEY_LENGTH", 32)),
		},
		Logging: LoggingConfig{
			Level: getEnv("LOG_LEVEL", "info"),
		},
	}

	// Validate required configuration
	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

// Validate validates the configuration
func (c *Config) Validate() error {
	if c.Database.URL == "" {
		return fmt.Errorf("DATABASE_URL is required")
	}
	if c.Redis.URL == "" {
		return fmt.Errorf("REDIS_URL is required")
	}
	if c.Security.SessionSecret == "" {
		return fmt.Errorf("SESSION_SECRET is required")
	}
	if len(c.Security.SessionSecret) < 32 {
		return fmt.Errorf("SESSION_SECRET must be at least 32 characters")
	}
	if c.Security.MasterEncryptionKey == "" {
		return fmt.Errorf("MASTER_ENCRYPTION_KEY is required")
	}
	if len(c.Security.MasterEncryptionKey) < 32 {
		return fmt.Errorf("MASTER_ENCRYPTION_KEY must be at least 32 characters")
	}
	if c.TLS.Enabled {
		if c.TLS.CertPath == "" || c.TLS.KeyPath == "" {
			return fmt.Errorf("TLS_CERT_PATH and TLS_KEY_PATH are required when TLS is enabled")
		}
	}
	return nil
}

// IsDevelopment returns true if running in development mode
func (c *Config) IsDevelopment() bool {
	return c.Server.Env == "development"
}

// IsProduction returns true if running in production mode
func (c *Config) IsProduction() bool {
	return c.Server.Env == "production"
}

// getEnv gets an environment variable with a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getEnvAsInt gets an environment variable as int with a default value
func getEnvAsInt(key string, defaultValue int) int {
	valueStr := getEnv(key, "")
	if value, err := strconv.Atoi(valueStr); err == nil {
		return value
	}
	return defaultValue
}

// getEnvAsBool gets an environment variable as bool with a default value
func getEnvAsBool(key string, defaultValue bool) bool {
	valueStr := getEnv(key, "")
	if value, err := strconv.ParseBool(valueStr); err == nil {
		return value
	}
	return defaultValue
}
