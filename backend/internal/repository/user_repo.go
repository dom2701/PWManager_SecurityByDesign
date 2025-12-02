package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/SecurityByDesign/pwmanager/internal/models"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// UserRepository handles user data persistence
type UserRepository struct {
	db *sqlx.DB
}

// NewUserRepository creates a new user repository
func NewUserRepository(db *sqlx.DB) *UserRepository {
	return &UserRepository{db: db}
}

// Create creates a new user
func (r *UserRepository) Create(ctx context.Context, email, passwordHash string) (*models.User, error) {
	user := &models.User{}

	query := `
		INSERT INTO users (email, password_hash)
		VALUES ($1, $2)
		RETURNING id, email, password_hash, created_at, updated_at
	`

	err := r.db.QueryRowxContext(ctx, query, email, passwordHash).StructScan(user)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return user, nil
}

// GetByID retrieves a user by ID
func (r *UserRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	user := &models.User{}

	query := `SELECT id, email, password_hash, created_at, updated_at FROM users WHERE id = $1`

	err := r.db.GetContext(ctx, user, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return user, nil
}

// GetByEmail retrieves a user by email
func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	user := &models.User{}

	query := `SELECT id, email, password_hash, created_at, updated_at FROM users WHERE email = $1`

	err := r.db.GetContext(ctx, user, query, email)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return user, nil
}

// EmailExists checks if an email is already registered
func (r *UserRepository) EmailExists(ctx context.Context, email string) (bool, error) {
	var exists bool
	query := `SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)`

	err := r.db.GetContext(ctx, &exists, query, email)
	if err != nil {
		return false, fmt.Errorf("failed to check email: %w", err)
	}

	return exists, nil
}

// UpdatePassword updates a user's password hash
func (r *UserRepository) UpdatePassword(ctx context.Context, userID uuid.UUID, passwordHash string) error {
	query := `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`

	result, err := r.db.ExecContext(ctx, query, passwordHash, userID)
	if err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}

// Delete deletes a user
func (r *UserRepository) Delete(ctx context.Context, userID uuid.UUID) error {
	query := `DELETE FROM users WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}
