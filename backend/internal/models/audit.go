package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// AuditLog represents an audit log entry
type AuditLog struct {
	ID        int64           `json:"id" db:"id"`
	UserID    *uuid.UUID      `json:"user_id,omitempty" db:"user_id"`
	Action    string          `json:"action" db:"action"`
	IPAddress string          `json:"ip_address" db:"ip_address"`
	UserAgent string          `json:"user_agent" db:"user_agent"`
	Details   json.RawMessage `json:"details,omitempty" db:"details"`
	Timestamp time.Time       `json:"timestamp" db:"timestamp"`
}

// AuditAction defines standard audit action types
type AuditAction string

const (
	// Authentication actions
	ActionUserRegistered AuditAction = "user.registered"
	ActionUserLogin      AuditAction = "user.login"
	ActionUserLogout     AuditAction = "user.logout"
	ActionLoginFailed    AuditAction = "user.login_failed"

	// MFA actions
	ActionMFASetup    AuditAction = "mfa.setup"
	ActionMFAEnabled  AuditAction = "mfa.enabled"
	ActionMFADisabled AuditAction = "mfa.disabled"
	ActionMFAVerified AuditAction = "mfa.verified"
	ActionMFAFailed   AuditAction = "mfa.failed"

	// Vault actions
	ActionVaultCreated  AuditAction = "vault.created"
	ActionVaultUpdated  AuditAction = "vault.updated"
	ActionVaultDeleted  AuditAction = "vault.deleted"
	ActionVaultAccessed AuditAction = "vault.accessed"

	// Entry actions
	ActionEntryCreated  AuditAction = "entry.created"
	ActionEntryUpdated  AuditAction = "entry.updated"
	ActionEntryDeleted  AuditAction = "entry.deleted"
	ActionEntryAccessed AuditAction = "entry.accessed"
)

// AuditLogRequest represents the request to create an audit log
type AuditLogRequest struct {
	UserID    *uuid.UUID             `json:"user_id,omitempty"`
	Action    AuditAction            `json:"action"`
	IPAddress string                 `json:"ip_address"`
	UserAgent string                 `json:"user_agent"`
	Details   map[string]interface{} `json:"details,omitempty"`
}

// AuditLogResponse represents the audit log response
type AuditLogResponse struct {
	ID        int64                  `json:"id"`
	UserID    *uuid.UUID             `json:"user_id,omitempty"`
	Action    string                 `json:"action"`
	IPAddress string                 `json:"ip_address"`
	UserAgent string                 `json:"user_agent"`
	Details   map[string]interface{} `json:"details,omitempty"`
	Timestamp time.Time              `json:"timestamp"`
}
