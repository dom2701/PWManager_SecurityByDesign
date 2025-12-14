package main

import (
	"bytes"
	"fmt"
	"log"
	"os"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file if it exists
	_ = godotenv.Load()

	// Get database URL from environment
	databaseURL := getEnv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}

	// Get migrations directory
	migrationsDir := os.Getenv("MIGRATIONS_DIR")
	if migrationsDir == "" {
		migrationsDir = "file://migrations"
	}

	// Create migration instance
	m, err := migrate.New(migrationsDir, databaseURL)
	if err != nil {
		log.Fatalf("Failed to create migrate instance: %v", err)
	}
	defer func() { _, _ = m.Close() }()

	// Get command from arguments
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	command := os.Args[1]

	switch command {
	case "up":
		// Run all up migrations
		if err := m.Up(); err != nil && err != migrate.ErrNoChange {
			log.Fatalf("Failed to run migrations: %v", err)
		}
		log.Println("Migrations applied successfully")

	case "down":
		// Run all down migrations
		if err := m.Down(); err != nil && err != migrate.ErrNoChange {
			log.Fatalf("Failed to rollback migrations: %v", err)
		}
		log.Println("Migrations rolled back successfully")

	case "force":
		// Force migration version (for fixing dirty state)
		if len(os.Args) < 3 {
			log.Fatal("force command requires a version number")
		}
		var version int
		if _, err := fmt.Sscanf(os.Args[2], "%d", &version); err != nil {
			log.Fatalf("Invalid version number: %v", err)
		}
		if err := m.Force(version); err != nil {
			log.Fatalf("Failed to force version: %v", err)
		}
		log.Printf("Forced database version to %d\n", version)

	case "version":
		// Get current migration version
		version, dirty, err := m.Version()
		if err != nil {
			log.Fatalf("Failed to get version: %v", err)
		}
		if dirty {
			log.Printf("Current version: %d (dirty)\n", version)
		} else {
			log.Printf("Current version: %d\n", version)
		}

	case "drop":
		// Drop everything in database
		if err := m.Drop(); err != nil {
			log.Fatalf("Failed to drop database: %v", err)
		}
		log.Println("Database dropped successfully")

	default:
		log.Printf("Unknown command: %s\n", command)
		printUsage()
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Println("Usage: migrate <command>")
	fmt.Println()
	fmt.Println("Commands:")
	fmt.Println("  up         Apply all up migrations")
	fmt.Println("  down       Rollback all migrations")
	fmt.Println("  force <v>  Force database version (for fixing dirty state)")
	fmt.Println("  version    Show current migration version")
	fmt.Println("  drop       Drop all tables (destructive!)")
	fmt.Println()
	fmt.Println("Environment variables:")
	fmt.Println("  DATABASE_URL     PostgreSQL connection string (required)")
	fmt.Println("  MIGRATIONS_DIR   Path to migrations directory (default: file://migrations)")
}

// getEnv gets an environment variable.
// It also checks for key + "_FILE" to read from a file (useful for Docker secrets)
func getEnv(key string) string {
	// Check for _FILE variant
	if filePath := os.Getenv(key + "_FILE"); filePath != "" {
		if content, err := os.ReadFile(filePath); err == nil {
			// Trim whitespace (newlines) that might be in the file
			return string(bytes.TrimSpace(content))
		}
	}

	if value := os.Getenv(key); value != "" {
		return value
	}
	return ""
}
