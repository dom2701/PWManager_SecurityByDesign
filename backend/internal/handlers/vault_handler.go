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

// VaultHandler handles vault-related requests
type VaultHandler struct {
	vaultRepo *repository.VaultRepository
	entryRepo *repository.EntryRepository
	auditRepo *repository.AuditRepository
	logger    *zap.Logger
}

// NewVaultHandler creates a new vault handler
func NewVaultHandler(
	vaultRepo *repository.VaultRepository,
	entryRepo *repository.EntryRepository,
	auditRepo *repository.AuditRepository,
	logger *zap.Logger,
) *VaultHandler {
	return &VaultHandler{
		vaultRepo: vaultRepo,
		entryRepo: entryRepo,
		auditRepo: auditRepo,
		logger:    logger,
	}
}

// Create creates a new vault
// @Summary      Create a new vault
// @Description  Create a new password vault with encryption salt
// @Tags         vaults
// @Accept       json
// @Produce      json
// @Param        request body models.VaultCreateRequest true "Vault Creation Request"
// @Success      201  {object}  models.VaultResponse
// @Failure      400  {object}  map[string]string
// @Failure      401  {object}  map[string]string
// @Failure      500  {object}  map[string]string
// @Router       /vaults [post]
func (h *VaultHandler) Create(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req models.VaultCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request: " + err.Error()})
		return
	}

	// Decode hex-encoded salt
	saltBytes, err := hex.DecodeString(req.EncryptionSalt)
	if err != nil || len(saltBytes) != 32 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid encryption_salt: must be 64-char hex string (32 bytes)"})
		return
	}

	// Create vault
	vault, err := h.vaultRepo.Create(c.Request.Context(), userID, req.Name, saltBytes)
	if err != nil {
		h.logger.Error("failed to create vault", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	// Audit log
	_ = h.auditRepo.Create(c.Request.Context(), &userID, models.ActionVaultCreated,
		middleware.GetClientIP(c), c.Request.UserAgent(), map[string]interface{}{
			"vault_id":   vault.ID.String(),
			"vault_name": vault.Name,
		})

	c.JSON(http.StatusCreated, models.VaultResponse{
		ID:             vault.ID,
		UserID:         vault.UserID,
		Name:           vault.Name,
		EncryptionSalt: hex.EncodeToString(vault.EncryptionSalt),
		EntriesCount:   0, // New vault has no entries
		CreatedAt:      vault.CreatedAt,
		UpdatedAt:      vault.UpdatedAt,
	})
}

// List lists all vaults for the current user
// @Summary      List vaults
// @Description  Get all vaults belonging to the current user
// @Tags         vaults
// @Produce      json
// @Success      200  {array}   models.VaultResponse
// @Failure      401  {object}  map[string]string
// @Failure      500  {object}  map[string]string
// @Router       /vaults [get]
func (h *VaultHandler) List(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	vaults, err := h.vaultRepo.GetByUserID(c.Request.Context(), userID)
	if err != nil {
		h.logger.Error("failed to list vaults", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	// Convert to response format
	responses := make([]models.VaultResponse, len(vaults))
	for i, vault := range vaults {
		// Count entries for this vault
		entryCount, err := h.entryRepo.CountByVaultID(c.Request.Context(), vault.ID)
		if err != nil {
			h.logger.Error("failed to count entries", zap.Error(err))
			entryCount = 0
		}

		responses[i] = models.VaultResponse{
			ID:             vault.ID,
			UserID:         vault.UserID,
			Name:           vault.Name,
			EncryptionSalt: hex.EncodeToString(vault.EncryptionSalt),
			EntriesCount:   entryCount,
			CreatedAt:      vault.CreatedAt,
			UpdatedAt:      vault.UpdatedAt,
		}
	}

	c.JSON(http.StatusOK, responses)
}

// Get retrieves a single vault
// @Summary      Get vault
// @Description  Get details of a specific vault
// @Tags         vaults
// @Produce      json
// @Param        id   path      string  true  "Vault ID"
// @Success      200  {object}  models.VaultResponse
// @Failure      400  {object}  map[string]string
// @Failure      403  {object}  map[string]string
// @Failure      404  {object}  map[string]string
// @Failure      500  {object}  map[string]string
// @Router       /vaults/{id} [get]
func (h *VaultHandler) Get(c *gin.Context) {
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

	// Check ownership
	owns, err := h.vaultRepo.CheckOwnership(c.Request.Context(), vaultID, userID)
	if err != nil {
		h.logger.Error("failed to check ownership", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	if !owns {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	vault, err := h.vaultRepo.GetByID(c.Request.Context(), vaultID)
	if err != nil {
		h.logger.Error("failed to get vault", zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "vault not found"})
		return
	}

	// Audit log
	_ = h.auditRepo.Create(c.Request.Context(), &userID, models.ActionVaultAccessed,
		middleware.GetClientIP(c), c.Request.UserAgent(), map[string]interface{}{
			"vault_id":   vault.ID.String(),
			"vault_name": vault.Name,
		})

	// Count entries for this vault
	entryCount, err := h.entryRepo.CountByVaultID(c.Request.Context(), vaultID)
	if err != nil {
		h.logger.Error("failed to count entries", zap.Error(err))
		entryCount = 0
	}

	c.JSON(http.StatusOK, models.VaultResponse{
		ID:             vault.ID,
		UserID:         vault.UserID,
		Name:           vault.Name,
		EncryptionSalt: hex.EncodeToString(vault.EncryptionSalt),
		EntriesCount:   entryCount,
		CreatedAt:      vault.CreatedAt,
		UpdatedAt:      vault.UpdatedAt,
	})
}

// Update updates a vault's name
// @Summary      Update vault
// @Description  Update the name of a vault
// @Tags         vaults
// @Accept       json
// @Produce      json
// @Param        id       path      string  true  "Vault ID"
// @Param        request  body      models.VaultUpdateRequest  true  "Update Request"
// @Success      200      {object}  map[string]string
// @Failure      400      {object}  map[string]string
// @Failure      403      {object}  map[string]string
// @Failure      500      {object}  map[string]string
// @Router       /vaults/{id} [put]
func (h *VaultHandler) Update(c *gin.Context) {
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

	var req models.VaultUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request: " + err.Error()})
		return
	}

	// Check ownership
	owns, err := h.vaultRepo.CheckOwnership(c.Request.Context(), vaultID, userID)
	if err != nil || !owns {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	// Update vault
	if err := h.vaultRepo.Update(c.Request.Context(), vaultID, req.Name); err != nil {
		h.logger.Error("failed to update vault", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	// Audit log
	_ = h.auditRepo.Create(c.Request.Context(), &userID, models.ActionVaultUpdated,
		middleware.GetClientIP(c), c.Request.UserAgent(), map[string]interface{}{
			"vault_id": vaultID.String(),
		})

	c.JSON(http.StatusOK, gin.H{"message": "vault updated successfully"})
}

// Delete deletes a vault
// @Summary      Delete vault
// @Description  Delete a vault and all its entries
// @Tags         vaults
// @Produce      json
// @Param        id   path      string  true  "Vault ID"
// @Success      200  {object}  map[string]string
// @Failure      400  {object}  map[string]string
// @Failure      403  {object}  map[string]string
// @Failure      500  {object}  map[string]string
// @Router       /vaults/{id} [delete]
func (h *VaultHandler) Delete(c *gin.Context) {
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

	// Check ownership
	owns, err := h.vaultRepo.CheckOwnership(c.Request.Context(), vaultID, userID)
	if err != nil || !owns {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	// Delete vault (will cascade to entries)
	if err := h.vaultRepo.Delete(c.Request.Context(), vaultID); err != nil {
		h.logger.Error("failed to delete vault", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	// Audit log
	_ = h.auditRepo.Create(c.Request.Context(), &userID, models.ActionVaultDeleted,
		middleware.GetClientIP(c), c.Request.UserAgent(), map[string]interface{}{
			"vault_id": vaultID.String(),
		})

	c.JSON(http.StatusOK, gin.H{"message": "vault deleted successfully"})
}
