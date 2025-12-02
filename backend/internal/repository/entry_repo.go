package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/SecurityByDesign/pwmanager/internal/models"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// EntryRepository handles vault entry data persistence
type EntryRepository struct {
	db *sqlx.DB
}

// NewEntryRepository creates a new entry repository
func NewEntryRepository(db *sqlx.DB) *EntryRepository {
	return &EntryRepository{db: db}
}

// Create creates a new vault entry
func (r *EntryRepository) Create(ctx context.Context, vaultID uuid.UUID, encryptedData, nonce []byte) (*models.VaultEntry, error) {
	entry := &models.VaultEntry{}

	query := `
		INSERT INTO vault_entries (vault_id, encrypted_data, nonce)
		VALUES ($1, $2, $3)
		RETURNING id, vault_id, encrypted_data, nonce, created_at, updated_at
	`

	err := r.db.QueryRowxContext(ctx, query, vaultID, encryptedData, nonce).StructScan(entry)
	if err != nil {
		return nil, fmt.Errorf("failed to create entry: %w", err)
	}

	return entry, nil
}

// GetByID retrieves an entry by ID
func (r *EntryRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.VaultEntry, error) {
	entry := &models.VaultEntry{}

	query := `
		SELECT id, vault_id, encrypted_data, nonce, created_at, updated_at
		FROM vault_entries
		WHERE id = $1
	`

	err := r.db.GetContext(ctx, entry, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("entry not found")
		}
		return nil, fmt.Errorf("failed to get entry: %w", err)
	}

	return entry, nil
}

// GetByVaultID retrieves all entries for a vault
func (r *EntryRepository) GetByVaultID(ctx context.Context, vaultID uuid.UUID) ([]*models.VaultEntry, error) {
	entries := []*models.VaultEntry{}

	query := `
		SELECT id, vault_id, encrypted_data, nonce, created_at, updated_at
		FROM vault_entries
		WHERE vault_id = $1
		ORDER BY created_at DESC
	`

	err := r.db.SelectContext(ctx, &entries, query, vaultID)
	if err != nil {
		return nil, fmt.Errorf("failed to get entries: %w", err)
	}

	return entries, nil
}

// Update updates an entry's encrypted data
func (r *EntryRepository) Update(ctx context.Context, id uuid.UUID, encryptedData, nonce []byte) error {
	query := `
		UPDATE vault_entries
		SET encrypted_data = $1, nonce = $2, updated_at = NOW()
		WHERE id = $3
	`

	result, err := r.db.ExecContext(ctx, query, encryptedData, nonce, id)
	if err != nil {
		return fmt.Errorf("failed to update entry: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("entry not found")
	}

	return nil
}

// Delete deletes an entry
func (r *EntryRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM vault_entries WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete entry: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("entry not found")
	}

	return nil
}

// CountByVaultID counts entries in a vault
func (r *EntryRepository) CountByVaultID(ctx context.Context, vaultID uuid.UUID) (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM vault_entries WHERE vault_id = $1`

	err := r.db.GetContext(ctx, &count, query, vaultID)
	if err != nil {
		return 0, fmt.Errorf("failed to count entries: %w", err)
	}

	return count, nil
}
