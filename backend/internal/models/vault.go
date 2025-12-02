package models

import (
	"time"

	"github.com/google/uuid"
)

// Vault represents a password vault container
type Vault struct {
	ID             uuid.UUID `json:"id" db:"id"`
	UserID         uuid.UUID `json:"user_id" db:"user_id"`
	Name           string    `json:"name" db:"name"`
	EncryptionSalt []byte    `json:"encryption_salt" db:"encryption_salt"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time `json:"updated_at" db:"updated_at"`
}

// VaultCreateRequest represents the request to create a new vault
type VaultCreateRequest struct {
	Name           string `json:"name" binding:"required,min=1,max=255"`
	EncryptionSalt string `json:"encryption_salt" binding:"required,len=64"` // Hex-encoded 32 bytes
}

// VaultUpdateRequest represents the request to update a vault
type VaultUpdateRequest struct {
	Name string `json:"name" binding:"required,min=1,max=255"`
}

// VaultResponse represents the vault response
type VaultResponse struct {
	ID             uuid.UUID `json:"id"`
	UserID         uuid.UUID `json:"user_id"`
	Name           string    `json:"name"`
	EncryptionSalt string    `json:"encryption_salt"` // Hex-encoded
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}
