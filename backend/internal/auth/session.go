package auth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

// SessionManager manages user sessions in Redis
type SessionManager struct {
	client      *redis.Client
	maxAge      time.Duration
	idleTimeout time.Duration
}

// Session represents a user session
type Session struct {
	ID        string
	UserID    uuid.UUID
	CreatedAt time.Time
	ExpiresAt time.Time
	LastSeen  time.Time
}

// NewSessionManager creates a new session manager
func NewSessionManager(client *redis.Client, maxAge, idleTimeout time.Duration) *SessionManager {
	return &SessionManager{
		client:      client,
		maxAge:      maxAge,
		idleTimeout: idleTimeout,
	}
}

// CreateSession creates a new session for a user
func (sm *SessionManager) CreateSession(ctx context.Context, userID uuid.UUID) (*Session, error) {
	// Generate cryptographically secure session ID
	sessionID, err := generateSessionID()
	if err != nil {
		return nil, fmt.Errorf("failed to generate session ID: %w", err)
	}

	now := time.Now()
	session := &Session{
		ID:        sessionID,
		UserID:    userID,
		CreatedAt: now,
		ExpiresAt: now.Add(sm.maxAge),
		LastSeen:  now,
	}

	// Store session in Redis with expiration
	key := sessionKey(sessionID)
	pipe := sm.client.Pipeline()
	pipe.HSet(ctx, key, map[string]interface{}{
		"user_id":    userID.String(),
		"created_at": now.Unix(),
		"last_seen":  now.Unix(),
	})
	pipe.Expire(ctx, key, sm.maxAge)

	if _, err := pipe.Exec(ctx); err != nil {
		return nil, fmt.Errorf("failed to store session: %w", err)
	}

	return session, nil
}

// GetSession retrieves a session by ID
func (sm *SessionManager) GetSession(ctx context.Context, sessionID string) (*Session, error) {
	key := sessionKey(sessionID)

	// Get session data from Redis
	data, err := sm.client.HGetAll(ctx, key).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve session: %w", err)
	}

	if len(data) == 0 {
		return nil, fmt.Errorf("session not found")
	}

	// Parse session data
	userID, err := uuid.Parse(data["user_id"])
	if err != nil {
		return nil, fmt.Errorf("invalid user_id in session: %w", err)
	}

	createdAt := time.Unix(parseInt64(data["created_at"]), 0)
	lastSeen := time.Unix(parseInt64(data["last_seen"]), 0)

	// Check idle timeout
	if time.Since(lastSeen) > sm.idleTimeout {
		// Session expired due to inactivity
		_ = sm.DeleteSession(ctx, sessionID)
		return nil, fmt.Errorf("session expired due to inactivity")
	}

	session := &Session{
		ID:        sessionID,
		UserID:    userID,
		CreatedAt: createdAt,
		ExpiresAt: createdAt.Add(sm.maxAge),
		LastSeen:  lastSeen,
	}

	return session, nil
}

// UpdateLastSeen updates the last seen timestamp for a session
func (sm *SessionManager) UpdateLastSeen(ctx context.Context, sessionID string) error {
	key := sessionKey(sessionID)

	// Update last_seen timestamp
	now := time.Now()
	err := sm.client.HSet(ctx, key, "last_seen", now.Unix()).Err()
	if err != nil {
		return fmt.Errorf("failed to update last_seen: %w", err)
	}

	// Refresh TTL
	err = sm.client.Expire(ctx, key, sm.maxAge).Err()
	if err != nil {
		return fmt.Errorf("failed to refresh TTL: %w", err)
	}

	return nil
}

// DeleteSession deletes a session (logout)
func (sm *SessionManager) DeleteSession(ctx context.Context, sessionID string) error {
	key := sessionKey(sessionID)
	err := sm.client.Del(ctx, key).Err()
	if err != nil {
		return fmt.Errorf("failed to delete session: %w", err)
	}
	return nil
}

// DeleteAllUserSessions deletes all sessions for a user
func (sm *SessionManager) DeleteAllUserSessions(ctx context.Context, userID uuid.UUID) error {
	// Scan for all sessions belonging to the user
	iter := sm.client.Scan(ctx, 0, "session:*", 0).Iterator()
	for iter.Next(ctx) {
		key := iter.Val()
		sessionUserID, err := sm.client.HGet(ctx, key, "user_id").Result()
		if err != nil {
			continue
		}

		if sessionUserID == userID.String() {
			_ = sm.client.Del(ctx, key).Err()
		}
	}

	if err := iter.Err(); err != nil {
		return fmt.Errorf("failed to scan sessions: %w", err)
	}

	return nil
}

// sessionKey generates a Redis key for a session
func sessionKey(sessionID string) string {
	return fmt.Sprintf("session:%s", sessionID)
}

// generateSessionID generates a cryptographically secure session ID
func generateSessionID() (string, error) {
	bytes := make([]byte, 32) // 256 bits
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// parseInt64 safely parses an int64 from a string
func parseInt64(s string) int64 {
	var i int64
	fmt.Sscanf(s, "%d", &i)
	return i
}
