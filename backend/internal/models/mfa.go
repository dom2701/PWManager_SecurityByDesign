package models

import (
	"time"

	"github.com/google/uuid"
)

// MFASecret represents the user's MFA configuration
type MFASecret struct {
	ID                   uuid.UUID `json:"id" db:"id"`
	UserID               uuid.UUID `json:"user_id" db:"user_id"`
	TOTPSecretEncrypted  []byte    `json:"-" db:"totp_secret_encrypted"`
	BackupCodesEncrypted []byte    `json:"-" db:"backup_codes_encrypted"`
	Method               string    `json:"method" db:"method"`
	Enabled              bool      `json:"enabled" db:"enabled"`
	CreatedAt            time.Time `json:"created_at" db:"created_at"`
	UpdatedAt            time.Time `json:"updated_at" db:"updated_at"`
}

// MFASetupResponse contains the data needed to set up MFA
type MFASetupResponse struct {
	Secret      string   `json:"secret"`
	QRCode      string   `json:"qr_code"` // Base64 encoded image
	BackupCodes []string `json:"backup_codes"`
}

// MFAVerifyRequest represents the request to verify MFA setup
type MFAVerifyRequest struct {
	Code string `json:"code" binding:"required,len=6"`
}

// MFALoginRequest is used when MFA is required during login
type MFALoginRequest struct {
	Code string `json:"code" binding:"required,len=6"`
}
