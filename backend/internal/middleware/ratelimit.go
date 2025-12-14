package middleware

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/ulule/limiter/v3"
	mgin "github.com/ulule/limiter/v3/drivers/middleware/gin"
	sredis "github.com/ulule/limiter/v3/drivers/store/redis"
)

// RateLimitMiddleware creates a new rate limit middleware
func RateLimitMiddleware(client *redis.Client, requestsPerMinute int, keyPrefix string) gin.HandlerFunc {
	// Define a rate: requestsPerMinute requests per minute
	rate := limiter.Rate{
		Period: 1 * time.Minute,
		Limit:  int64(requestsPerMinute),
	}

	// Create a store with the redis client
	store, err := sredis.NewStoreWithOptions(client, limiter.StoreOptions{
		Prefix:   keyPrefix,
		MaxRetry: 3,
	})
	if err != nil {
		log.Printf("Failed to create rate limit store: %v", err)
		return func(c *gin.Context) {
			c.Next()
		}
	}

	// Create a new middleware with the limiter instance
	middleware := mgin.NewMiddleware(limiter.New(store, rate))

	return middleware
}

// StrictRateLimitMiddleware creates a stricter rate limit middleware for sensitive endpoints
// It returns a 429 Too Many Requests error if the limit is exceeded
func StrictRateLimitMiddleware(client *redis.Client, requestsPerMinute int, keyPrefix string) gin.HandlerFunc {
	return RateLimitMiddleware(client, requestsPerMinute, keyPrefix)
}

// CustomErrorHandler is an optional custom error handler for the rate limiter
func CustomErrorHandler(c *gin.Context, err error) {
	c.JSON(http.StatusTooManyRequests, gin.H{
		"error": "Too many requests, please try again later.",
	})
}
