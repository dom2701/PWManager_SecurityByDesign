package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// CSRFMiddleware checks for valid CSRF token in headers
func CSRFMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip for safe methods
		if c.Request.Method == "GET" || c.Request.Method == "HEAD" || c.Request.Method == "OPTIONS" {
			c.Next()
			return
		}

		// Get CSRF token from context (set by AuthMiddleware)
		expectedToken, exists := c.Get("csrf_token")
		if !exists {
			// If no session, we assume the user is not authenticated, 
			// so CSRF protection based on session is not applicable.
			c.Next()
			return
		}

		// Get CSRF token from header
		clientToken := c.GetHeader("X-CSRF-Token")
		if clientToken == "" {
			c.JSON(http.StatusForbidden, gin.H{"error": "CSRF token missing"})
			c.Abort()
			return
		}

		if clientToken != expectedToken.(string) {
			c.JSON(http.StatusForbidden, gin.H{"error": "CSRF token invalid"})
			c.Abort()
			return
		}

		c.Next()
	}
}
