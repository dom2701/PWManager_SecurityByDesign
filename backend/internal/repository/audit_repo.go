package repository

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/SecurityByDesign/pwmanager/internal/models"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// AuditRepository handles audit log data persistence
type AuditRepository struct {
	db *sqlx.DB
}

// NewAuditRepository creates a new audit repository
func NewAuditRepository(db *sqlx.DB) *AuditRepository {
	return &AuditRepository{db: db}
}

// Create creates a new audit log entry
func (r *AuditRepository) Create(ctx context.Context, userID *uuid.UUID, action models.AuditAction, ipAddress, userAgent string, details map[string]interface{}) error {
	var detailsJSON []byte
	var err error

	if details != nil {
		detailsJSON, err = json.Marshal(details)
		if err != nil {
			return fmt.Errorf("failed to marshal details: %w", err)
		}
	}

	query := `
		INSERT INTO audit_logs (user_id, action, ip_address, user_agent, details)
		VALUES ($1, $2, $3, $4, $5)
	`

	_, err = r.db.ExecContext(ctx, query, userID, action, ipAddress, userAgent, detailsJSON)
	if err != nil {
		return fmt.Errorf("failed to create audit log: %w", err)
	}

	return nil
}

// GetByUserID retrieves audit logs for a user with pagination
func (r *AuditRepository) GetByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*models.AuditLog, error) {
	logs := []*models.AuditLog{}

	query := `
		SELECT id, user_id, action, ip_address, user_agent, details, timestamp
		FROM audit_logs
		WHERE user_id = $1
		ORDER BY timestamp DESC
		LIMIT $2 OFFSET $3
	`

	err := r.db.SelectContext(ctx, &logs, query, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get audit logs: %w", err)
	}

	return logs, nil
}

// GetRecent retrieves recent audit logs with pagination
func (r *AuditRepository) GetRecent(ctx context.Context, limit, offset int) ([]*models.AuditLog, error) {
	logs := []*models.AuditLog{}

	query := `
		SELECT id, user_id, action, ip_address, user_agent, details, timestamp
		FROM audit_logs
		ORDER BY timestamp DESC
		LIMIT $1 OFFSET $2
	`

	err := r.db.SelectContext(ctx, &logs, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get audit logs: %w", err)
	}

	return logs, nil
}

// CountByUserID counts audit logs for a user
func (r *AuditRepository) CountByUserID(ctx context.Context, userID uuid.UUID) (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM audit_logs WHERE user_id = $1`

	err := r.db.GetContext(ctx, &count, query, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to count audit logs: %w", err)
	}

	return count, nil
}

// GetByID retrieves a single audit log by ID
func (r *AuditRepository) GetByID(ctx context.Context, logID string) (*models.AuditLog, error) {
	log := &models.AuditLog{}

	query := `
		SELECT id, user_id, action, ip_address, user_agent, details, timestamp
		FROM audit_logs
		WHERE id = $1
	`

	err := r.db.GetContext(ctx, log, query, logID)
	if err != nil {
		if err.Error() == "sql: no rows in result set" {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get audit log: %w", err)
	}

	return log, nil
}
