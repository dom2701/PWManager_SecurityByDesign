package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/SecurityByDesign/pwmanager/internal/models"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// MFARepository handles MFA data persistence
type MFARepository struct {
	db *sqlx.DB
}

// NewMFARepository creates a new MFA repository
func NewMFARepository(db *sqlx.DB) *MFARepository {
	return &MFARepository{db: db}
}

// Create creates a new MFA secret
func (r *MFARepository) Create(ctx context.Context, mfa *models.MFASecret) error {
	query := `
		INSERT INTO mfa_secrets (user_id, totp_secret_encrypted, backup_codes_encrypted, method, enabled)
		VALUES (:user_id, :totp_secret_encrypted, :backup_codes_encrypted, :method, :enabled)
		RETURNING id, created_at, updated_at
	`

	rows, err := r.db.NamedQueryContext(ctx, query, mfa)
	if err != nil {
		return fmt.Errorf("failed to create mfa secret: %w", err)
	}
	defer rows.Close()

	if rows.Next() {
		if err := rows.Scan(&mfa.ID, &mfa.CreatedAt, &mfa.UpdatedAt); err != nil {
			return fmt.Errorf("failed to scan mfa secret: %w", err)
		}
	}

	return nil
}

// GetByUserID retrieves MFA secret by user ID
func (r *MFARepository) GetByUserID(ctx context.Context, userID uuid.UUID) (*models.MFASecret, error) {
	mfa := &models.MFASecret{}

	query := `SELECT * FROM mfa_secrets WHERE user_id = $1`

	err := r.db.GetContext(ctx, mfa, query, userID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // Not found is not an error here
		}
		return nil, fmt.Errorf("failed to get mfa secret: %w", err)
	}

	return mfa, nil
}

// Update updates an MFA secret
func (r *MFARepository) Update(ctx context.Context, mfa *models.MFASecret) error {
	query := `
		UPDATE mfa_secrets 
		SET totp_secret_encrypted = :totp_secret_encrypted,
			backup_codes_encrypted = :backup_codes_encrypted,
			method = :method,
			enabled = :enabled,
			updated_at = NOW()
		WHERE id = :id
	`

	_, err := r.db.NamedExecContext(ctx, query, mfa)
	if err != nil {
		return fmt.Errorf("failed to update mfa secret: %w", err)
	}

	return nil
}

// Delete deletes an MFA secret
func (r *MFARepository) Delete(ctx context.Context, userID uuid.UUID) error {
	query := `DELETE FROM mfa_secrets WHERE user_id = $1`

	_, err := r.db.ExecContext(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("failed to delete mfa secret: %w", err)
	}

	return nil
}
