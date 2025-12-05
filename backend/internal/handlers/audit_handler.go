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
