package models

import (
	"time"

	"github.com/google/uuid"
)

// VaultEntry represents an encrypted password entry within a vault
type VaultEntry struct {
	ID            uuid.UUID `json:"id" db:"id"`
	VaultID       uuid.UUID `json:"vault_id" db:"vault_id"`
	EncryptedData []byte    `json:"encrypted_data" db:"encrypted_data"`
	Nonce         []byte    `json:"nonce" db:"nonce"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time `json:"updated_at" db:"updated_at"`
}

// VaultEntryCreateRequest represents the request to create a new vault entry
type VaultEntryCreateRequest struct {
	EncryptedData string `json:"encrypted_data" binding:"required"` // Hex-encoded encrypted data
	Nonce         string `json:"nonce" binding:"required,len=24"`   // Hex-encoded 12 bytes
}

// VaultEntryUpdateRequest represents the request to update a vault entry
type VaultEntryUpdateRequest struct {
	EncryptedData string `json:"encrypted_data" binding:"required"` // Hex-encoded encrypted data
	Nonce         string `json:"nonce" binding:"required,len=24"`   // Hex-encoded 12 bytes
}

// VaultEntryResponse represents the vault entry response
type VaultEntryResponse struct {
	ID            uuid.UUID `json:"id"`
	VaultID       uuid.UUID `json:"vault_id"`
	EncryptedData string    `json:"encrypted_data"` // Hex-encoded
	Nonce         string    `json:"nonce"`          // Hex-encoded
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}
