package main

import (
	"log"

	"go.uber.org/zap"
)

func main() {

	// Initialize logger
	ar logger *zap.Logger
	if cfg.IsDevelopment() {
		logger, err = zap.NewDevelopment()
	} else {
		logger, err = zap.NewProduction()
	}
	if err != nil {
		log.Fatalf("Failed to initialize logger: %v", err)
	}
	defer logger.Sync()

}
