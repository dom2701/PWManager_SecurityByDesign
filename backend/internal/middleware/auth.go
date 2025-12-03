package middleware

import (
	"net/http"
	"strings"

	"github.com/SecurityByDesign/pwmanager/internal/auth"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// AuthMiddleware checks for valid session
func AuthMiddleware(sessionManager *auth.SessionManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get session ID from cookie
		sessionID, err := c.Cookie("session_id")
		if err != nil || sessionID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized: no session"})
			c.Abort()
			return
		}

		// Validate session
		session, err := sessionManager.GetSession(c.Request.Context(), sessionID)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized: invalid session"})
			c.Abort()
			return
		}

		// Update last seen timestamp
		if err := sessionManager.UpdateLastSeen(c.Request.Context(), sessionID); err != nil {
			// Log error but don't fail the request
			_ = c.Error(err)
		}

		// Store user ID in context for handlers
		c.Set("user_id", session.UserID)
		c.Set("session_id", sessionID)

		c.Next()
	}
}

// OptionalAuthMiddleware optionally loads user if session exists
func OptionalAuthMiddleware(sessionManager *auth.SessionManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		sessionID, err := c.Cookie("session_id")
		if err != nil || sessionID == "" {
			c.Next()
			return
		}

		session, err := sessionManager.GetSession(c.Request.Context(), sessionID)
		if err != nil {
			c.Next()
			return
		}

		_ = sessionManager.UpdateLastSeen(c.Request.Context(), sessionID)

		c.Set("user_id", session.UserID)
		c.Set("session_id", sessionID)

		c.Next()
	}
}

// GetUserID extracts user ID from Gin context
func GetUserID(c *gin.Context) (uuid.UUID, error) {
	userID, exists := c.Get("user_id")
	if !exists {
		return uuid.Nil, http.ErrNoCookie
	}

	uid, ok := userID.(uuid.UUID)
	if !ok {
		return uuid.Nil, http.ErrNoCookie
	}

	return uid, nil
}

// GetSessionID extracts session ID from Gin context
func GetSessionID(c *gin.Context) (string, error) {
	sessionID, exists := c.Get("session_id")
	if !exists {
		return "", http.ErrNoCookie
	}

	sid, ok := sessionID.(string)
	if !ok {
		return "", http.ErrNoCookie
	}

	return sid, nil
}

// GetClientIP extracts the real client IP address
func GetClientIP(c *gin.Context) string {
	// Check X-Forwarded-For header first (for proxies/load balancers)
	forwarded := c.GetHeader("X-Forwarded-For")
	if forwarded != "" {
		// Take the first IP if multiple are present
		ips := strings.Split(forwarded, ",")
		return strings.TrimSpace(ips[0])
	}

	// Check X-Real-IP header
	realIP := c.GetHeader("X-Real-IP")
	if realIP != "" {
		return realIP
	}

	// Fall back to RemoteAddr
	return c.ClientIP()
}
