package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/SecurityByDesign/pwmanager/internal/models"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// VaultRepository handles vault data persistence
type VaultRepository struct {
	db *sqlx.DB
}

// NewVaultRepository creates a new vault repository
func NewVaultRepository(db *sqlx.DB) *VaultRepository {
	return &VaultRepository{db: db}
}

// Create creates a new vault
func (r *VaultRepository) Create(ctx context.Context, userID uuid.UUID, name string, encryptionSalt []byte) (*models.Vault, error) {
	vault := &models.Vault{}

	query := `
		INSERT INTO vaults (user_id, name, encryption_salt)
		VALUES ($1, $2, $3)
		RETURNING id, user_id, name, encryption_salt, created_at, updated_at
	`

	err := r.db.QueryRowxContext(ctx, query, userID, name, encryptionSalt).StructScan(vault)
	if err != nil {
		return nil, fmt.Errorf("failed to create vault: %w", err)
	}

	return vault, nil
}

// GetByID retrieves a vault by ID
func (r *VaultRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Vault, error) {
	vault := &models.Vault{}

	query := `
		SELECT id, user_id, name, encryption_salt, created_at, updated_at
		FROM vaults
		WHERE id = $1
	`

	err := r.db.GetContext(ctx, vault, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("vault not found")
		}
		return nil, fmt.Errorf("failed to get vault: %w", err)
	}

	return vault, nil
}

// GetByUserID retrieves all vaults for a user
func (r *VaultRepository) GetByUserID(ctx context.Context, userID uuid.UUID) ([]*models.Vault, error) {
	vaults := []*models.Vault{}

	query := `
		SELECT id, user_id, name, encryption_salt, created_at, updated_at
		FROM vaults
		WHERE user_id = $1
		ORDER BY created_at DESC
	`

	err := r.db.SelectContext(ctx, &vaults, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get vaults: %w", err)
	}

	return vaults, nil
}

// Update updates a vault's name
func (r *VaultRepository) Update(ctx context.Context, id uuid.UUID, name string) error {
	query := `
		UPDATE vaults
		SET name = $1, updated_at = NOW()
		WHERE id = $2
	`

	result, err := r.db.ExecContext(ctx, query, name, id)
	if err != nil {
		return fmt.Errorf("failed to update vault: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("vault not found")
	}

	return nil
}

// Delete deletes a vault (will cascade to entries)
func (r *VaultRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM vaults WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete vault: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("vault not found")
	}

	return nil
}

// CheckOwnership checks if a vault belongs to a user
func (r *VaultRepository) CheckOwnership(ctx context.Context, vaultID, userID uuid.UUID) (bool, error) {
	var exists bool
	query := `SELECT EXISTS(SELECT 1 FROM vaults WHERE id = $1 AND user_id = $2)`

	err := r.db.GetContext(ctx, &exists, query, vaultID, userID)
	if err != nil {
		return false, fmt.Errorf("failed to check ownership: %w", err)
	}

	return exists, nil
}
