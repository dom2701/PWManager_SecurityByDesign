package handlers

import (
	"encoding/hex"
	"net/http"

	"github.com/SecurityByDesign/pwmanager/internal/middleware"
	"github.com/SecurityByDesign/pwmanager/internal/models"
	"github.com/SecurityByDesign/pwmanager/internal/repository"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// EntryHandler handles vault entry-related requests
type EntryHandler struct {
	entryRepo *repository.EntryRepository
	vaultRepo *repository.VaultRepository
	auditRepo *repository.AuditRepository
	logger    *zap.Logger
}

// NewEntryHandler creates a new entry handler
func NewEntryHandler(
	entryRepo *repository.EntryRepository,
	vaultRepo *repository.VaultRepository,
	auditRepo *repository.AuditRepository,
	logger *zap.Logger,
) *EntryHandler {
	return &EntryHandler{
		entryRepo: entryRepo,
		vaultRepo: vaultRepo,
		auditRepo: auditRepo,
		logger:    logger,
	}
}

// Create creates a new vault entry
// @Summary      Create vault entry
// @Description  Create a new encrypted entry in a vault
// @Tags         entries
// @Accept       json
// @Produce      json
// @Param        id       path      string  true  "Vault ID"
// @Param        request  body      models.VaultEntryCreateRequest  true  "Entry Creation Request"
// @Success      201      {object}  models.VaultEntryResponse
// @Failure      400      {object}  map[string]string
// @Failure      403      {object}  map[string]string
// @Failure      500      {object}  map[string]string
// @Router       /vaults/{id}/entries [post]
func (h *EntryHandler) Create(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	vaultID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid vault ID"})
		return
	}

	// Check vault ownership
	owns, err := h.vaultRepo.CheckOwnership(c.Request.Context(), vaultID, userID)
	if err != nil || !owns {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	var req models.VaultEntryCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request: " + err.Error()})
		return
	}

	// Decode hex-encoded data
	encryptedData, err := hex.DecodeString(req.EncryptedData)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid encrypted_data: must be hex string"})
		return
	}

	nonce, err := hex.DecodeString(req.Nonce)
	if err != nil || len(nonce) != 12 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid nonce: must be 24-char hex string (12 bytes)"})
		return
	}

	// Create entry
	entry, err := h.entryRepo.Create(c.Request.Context(), vaultID, encryptedData, nonce)
	if err != nil {
		h.logger.Error("failed to create entry", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	// Audit log
	_ = h.auditRepo.Create(c.Request.Context(), &userID, models.ActionEntryCreated,
		middleware.GetClientIP(c), c.Request.UserAgent(), map[string]interface{}{
			"vault_id": vaultID.String(),
			"entry_id": entry.ID.String(),
		})

	c.JSON(http.StatusCreated, models.VaultEntryResponse{
		ID:            entry.ID,
		VaultID:       entry.VaultID,
		EncryptedData: hex.EncodeToString(entry.EncryptedData),
		Nonce:         hex.EncodeToString(entry.Nonce),
		CreatedAt:     entry.CreatedAt,
		UpdatedAt:     entry.UpdatedAt,
	})
}

// List lists all entries in a vault
// @Summary      List vault entries
// @Description  Get all encrypted entries in a specific vault
// @Tags         entries
// @Produce      json
// @Param        id   path      string  true  "Vault ID"
// @Success      200  {array}   models.VaultEntryResponse
// @Failure      400  {object}  map[string]string
// @Failure      403  {object}  map[string]string
// @Failure      500  {object}  map[string]string
// @Router       /vaults/{id}/entries [get]
func (h *EntryHandler) List(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	vaultID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid vault ID"})
		return
	}

	// Check vault ownership
	owns, err := h.vaultRepo.CheckOwnership(c.Request.Context(), vaultID, userID)
	if err != nil || !owns {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	// Audit log
	_ = h.auditRepo.Create(c.Request.Context(), &userID, models.ActionVaultAccessed,
		middleware.GetClientIP(c), c.Request.UserAgent(), map[string]interface{}{
			"vault_id":  vaultID.String(),
			"operation": "list_entries",
		})

	entries, err := h.entryRepo.GetByVaultID(c.Request.Context(), vaultID)
	if err != nil {
		h.logger.Error("failed to list entries", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	// Convert to response format
	responses := make([]models.VaultEntryResponse, len(entries))
	for i, entry := range entries {
		responses[i] = models.VaultEntryResponse{
			ID:            entry.ID,
			VaultID:       entry.VaultID,
			EncryptedData: hex.EncodeToString(entry.EncryptedData),
			Nonce:         hex.EncodeToString(entry.Nonce),
			CreatedAt:     entry.CreatedAt,
			UpdatedAt:     entry.UpdatedAt,
		}
	}

	c.JSON(http.StatusOK, responses)
}

// Get retrieves a single entry
// @Summary      Get vault entry
// @Description  Get a specific encrypted entry
// @Tags         entries
// @Produce      json
// @Param        id   path      string  true  "Entry ID"
// @Success      200  {object}  models.VaultEntryResponse
// @Failure      400  {object}  map[string]string
// @Failure      403  {object}  map[string]string
// @Failure      404  {object}  map[string]string
// @Router       /entries/{id} [get]
func (h *EntryHandler) Get(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	entryID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid entry ID"})
		return
	}

	entry, err := h.entryRepo.GetByID(c.Request.Context(), entryID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "entry not found"})
		return
	}

	// Check vault ownership
	owns, err := h.vaultRepo.CheckOwnership(c.Request.Context(), entry.VaultID, userID)
	if err != nil || !owns {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	// Audit log
	_ = h.auditRepo.Create(c.Request.Context(), &userID, models.ActionEntryAccessed,
		middleware.GetClientIP(c), c.Request.UserAgent(), map[string]interface{}{
			"entry_id": entry.ID.String(),
			"vault_id": entry.VaultID.String(),
		})

	c.JSON(http.StatusOK, models.VaultEntryResponse{
		ID:            entry.ID,
		VaultID:       entry.VaultID,
		EncryptedData: hex.EncodeToString(entry.EncryptedData),
		Nonce:         hex.EncodeToString(entry.Nonce),
		CreatedAt:     entry.CreatedAt,
		UpdatedAt:     entry.UpdatedAt,
	})
}

// Update updates an entry
// @Summary      Update vault entry
// @Description  Update an encrypted entry
// @Tags         entries
// @Accept       json
// @Produce      json
// @Param        id       path      string  true  "Entry ID"
// @Param        request  body      models.VaultEntryUpdateRequest  true  "Update Request"
// @Success      200      {object}  map[string]string
// @Failure      400      {object}  map[string]string
// @Failure      403      {object}  map[string]string
// @Failure      404      {object}  map[string]string
// @Failure      500      {object}  map[string]string
// @Router       /entries/{id} [put]
func (h *EntryHandler) Update(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	entryID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid entry ID"})
		return
	}

	var req models.VaultEntryUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request: " + err.Error()})
		return
	}

	// Get entry to check ownership
	entry, err := h.entryRepo.GetByID(c.Request.Context(), entryID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "entry not found"})
		return
	}

	owns, err := h.vaultRepo.CheckOwnership(c.Request.Context(), entry.VaultID, userID)
	if err != nil || !owns {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	// Decode hex-encoded data
	encryptedData, err := hex.DecodeString(req.EncryptedData)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid encrypted_data"})
		return
	}

	nonce, err := hex.DecodeString(req.Nonce)
	if err != nil || len(nonce) != 12 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid nonce"})
		return
	}

	// Update entry
	if err := h.entryRepo.Update(c.Request.Context(), entryID, encryptedData, nonce); err != nil {
		h.logger.Error("failed to update entry", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	// Audit log
	_ = h.auditRepo.Create(c.Request.Context(), &userID, models.ActionEntryUpdated,
		middleware.GetClientIP(c), c.Request.UserAgent(), map[string]interface{}{
			"entry_id": entryID.String(),
		})

	c.JSON(http.StatusOK, gin.H{"message": "entry updated successfully"})
}

// Delete deletes an entry
// @Summary      Delete vault entry
// @Description  Delete an encrypted entry
// @Tags         entries
// @Produce      json
// @Param        id   path      string  true  "Entry ID"
// @Success      200  {object}  map[string]string
// @Failure      400  {object}  map[string]string
// @Failure      403  {object}  map[string]string
// @Failure      404  {object}  map[string]string
// @Failure      500  {object}  map[string]string
// @Router       /entries/{id} [delete]
func (h *EntryHandler) Delete(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	entryID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid entry ID"})
		return
	}

	// Get entry to check ownership
	entry, err := h.entryRepo.GetByID(c.Request.Context(), entryID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "entry not found"})
		return
	}

	owns, err := h.vaultRepo.CheckOwnership(c.Request.Context(), entry.VaultID, userID)
	if err != nil || !owns {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	// Delete entry
	if err := h.entryRepo.Delete(c.Request.Context(), entryID); err != nil {
		h.logger.Error("failed to delete entry", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	// Audit log
	_ = h.auditRepo.Create(c.Request.Context(), &userID, models.ActionEntryDeleted,
		middleware.GetClientIP(c), c.Request.UserAgent(), map[string]interface{}{
			"entry_id": entryID.String(),
		})

	c.JSON(http.StatusOK, gin.H{"message": "entry deleted successfully"})
}
