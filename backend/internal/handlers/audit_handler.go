package handlers

import (
	"net/http"

	"github.com/SecurityByDesign/pwmanager/internal/middleware"
	"github.com/SecurityByDesign/pwmanager/internal/models"
	"github.com/SecurityByDesign/pwmanager/internal/repository"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// AuditHandler handles audit log requests
type AuditHandler struct {
	auditRepo *repository.AuditRepository
	logger    *zap.Logger
}

// NewAuditHandler creates a new audit handler
func NewAuditHandler(
	auditRepo *repository.AuditRepository,
	logger *zap.Logger,
) *AuditHandler {
	return &AuditHandler{
		auditRepo: auditRepo,
		logger:    logger,
	}
}

// List retrieves audit logs for the current user
// @Summary      List audit logs
// @Description  Get audit logs for the authenticated user
// @Tags         audit
// @Produce      json
// @Param        limit   query      int     false  "Number of logs to return"
// @Param        offset  query      int     false  "Offset for pagination"
// @Param        sort    query      string  false  "Sort order"
// @Success      200     {array}    models.AuditLog
// @Failure      401     {object}   map[string]string
// @Failure      500     {object}   map[string]string
// @Router       /audit/logs [get]
func (h *AuditHandler) List(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// Default pagination values
	limit := 500
	offset := 0

	// Get audit logs for user
	logs, err := h.auditRepo.GetByUserID(c.Request.Context(), userID, limit, offset)
	if err != nil {
		h.logger.Error("failed to list audit logs", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	// Return empty array if no logs
	if logs == nil {
		logs = []*models.AuditLog{}
	}

	c.JSON(http.StatusOK, logs)
}

// Get retrieves a single audit log by ID
// @Summary      Get audit log
// @Description  Get a single audit log by ID for the authenticated user
// @Tags         audit
// @Produce      json
// @Param        id      path       string  true   "Audit log ID"
// @Success      200     {object}   models.AuditLog
// @Failure      401     {object}   map[string]string
// @Failure      404     {object}   map[string]string
// @Failure      500     {object}   map[string]string
// @Router       /audit/logs/{id} [get]
func (h *AuditHandler) Get(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	logID := c.Param("id")
	if logID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "log id required"})
		return
	}

	// Get audit log - ensure user owns it
	log, err := h.auditRepo.GetByID(c.Request.Context(), logID)
	if err != nil {
		h.logger.Error("failed to get audit log", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	if log == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "audit log not found"})
		return
	}

	// Verify user owns this log
	if log.UserID == nil || *log.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	c.JSON(http.StatusOK, log)
}
