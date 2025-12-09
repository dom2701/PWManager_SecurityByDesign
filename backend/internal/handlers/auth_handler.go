package handlers

import (
	"bytes"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"image/png"
	"net/http"
	"strings"
	"time"

	"github.com/SecurityByDesign/pwmanager/internal/auth"
	"github.com/SecurityByDesign/pwmanager/internal/middleware"
	"github.com/SecurityByDesign/pwmanager/internal/models"
	"github.com/SecurityByDesign/pwmanager/internal/repository"
	"github.com/SecurityByDesign/pwmanager/pkg/crypto"
	"github.com/gin-gonic/gin"
	"github.com/pquerna/otp/totp"
	"go.uber.org/zap"
)

// AuthHandler handles authentication-related requests
type AuthHandler struct {
	userRepo       *repository.UserRepository
	mfaRepo        *repository.MFARepository
	auditRepo      *repository.AuditRepository
	sessionManager *auth.SessionManager
	argon2Params   *crypto.Argon2Params
	encryptionKey  string
	logger         *zap.Logger
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(
	userRepo *repository.UserRepository,
	mfaRepo *repository.MFARepository,
	auditRepo *repository.AuditRepository,
	sessionManager *auth.SessionManager,
	argon2Params *crypto.Argon2Params,
	encryptionKey string,
	logger *zap.Logger,
) *AuthHandler {
	return &AuthHandler{
		userRepo:       userRepo,
		mfaRepo:        mfaRepo,
		auditRepo:      auditRepo,
		sessionManager: sessionManager,
		argon2Params:   argon2Params,
		encryptionKey:  encryptionKey,
		logger:         logger,
	}
}

// Register handles user registration
// @Summary      Register a new user
// @Description  Register a new user with email and password
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        request body models.UserRegistrationRequest true "Registration Request"
// @Success      201  {object}  map[string]interface{}
// @Failure      400  {object}  map[string]string
// @Failure      409  {object}  map[string]string
// @Failure      500  {object}  map[string]string
// @Router       /auth/register [post]
func (h *AuthHandler) Register(c *gin.Context) {
	var req models.UserRegistrationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request: " + err.Error()})
		return
	}

	// Check if email already exists
	exists, err := h.userRepo.EmailExists(c.Request.Context(), req.Email)
	if err != nil {
		h.logger.Error("failed to check email", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	if exists {
		c.JSON(http.StatusConflict, gin.H{"error": "email already registered"})
		return
	}

	// Hash password with Argon2id
	passwordHash, err := crypto.HashPassword(req.Password, h.argon2Params)
	if err != nil {
		h.logger.Error("failed to hash password", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	// Create user
	user, err := h.userRepo.Create(c.Request.Context(), req.Email, passwordHash)
	if err != nil {
		h.logger.Error("failed to create user", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	// Audit log
	_ = h.auditRepo.Create(c.Request.Context(), &user.ID, models.ActionUserRegistered,
		middleware.GetClientIP(c), c.Request.UserAgent(), nil)

	c.JSON(http.StatusCreated, gin.H{
		"message": "user registered successfully",
		"user":    user.ToResponse(),
	})
}

// Login handles user login
// @Summary      Login user
// @Description  Login with email and password to receive a session cookie
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        request body models.UserLoginRequest true "Login Request"
// @Success      200  {object}  map[string]interface{}
// @Failure      400  {object}  map[string]string
// @Failure      401  {object}  map[string]string
// @Failure      500  {object}  map[string]string
// @Router       /auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	var req models.UserLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request: " + err.Error()})
		return
	}

	// Get user by email
	user, err := h.userRepo.GetByEmail(c.Request.Context(), req.Email)
	if err != nil {
		// Don't reveal whether user exists
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		_ = h.auditRepo.Create(c.Request.Context(), nil, models.ActionLoginFailed,
			middleware.GetClientIP(c), c.Request.UserAgent(), map[string]interface{}{
				"email":  req.Email,
				"reason": "user_not_found",
			})
		return
	}

	// Verify password
	valid, err := crypto.VerifyPassword(req.Password, user.PasswordHash)
	if err != nil {
		h.logger.Error("failed to verify password", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	if !valid {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		_ = h.auditRepo.Create(c.Request.Context(), &user.ID, models.ActionLoginFailed,
			middleware.GetClientIP(c), c.Request.UserAgent(), map[string]interface{}{
				"reason": "invalid_password",
			})
		return
	}

	// Check MFA
	mfa, err := h.mfaRepo.GetByUserID(c.Request.Context(), user.ID)
	if err != nil {
		h.logger.Error("failed to check mfa status", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	if mfa != nil && mfa.Enabled {
		if req.MFACode == "" {
			c.JSON(http.StatusForbidden, gin.H{"error": "mfa_required", "message": "MFA code required"})
			return
		}

		// Decrypt secret
		secretBytes, err := crypto.Decrypt(mfa.TOTPSecretEncrypted, h.encryptionKey)
		if err != nil {
			h.logger.Error("failed to decrypt secret", zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
			return
		}

		// Validate code
		validMFA := totp.Validate(req.MFACode, string(secretBytes))
		if !validMFA {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid mfa code"})
			_ = h.auditRepo.Create(c.Request.Context(), &user.ID, models.ActionMFAFailed,
				middleware.GetClientIP(c), c.Request.UserAgent(), nil)
			return
		}

		// Log MFA verification success
		_ = h.auditRepo.Create(c.Request.Context(), &user.ID, models.ActionMFAVerified,
			middleware.GetClientIP(c), c.Request.UserAgent(), nil)
	}

	// Create session
	session, err := h.sessionManager.CreateSession(c.Request.Context(), user.ID)
	if err != nil {
		h.logger.Error("failed to create session", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	// Set session cookie
	c.SetCookie(
		"session_id",
		session.ID,
		int(time.Until(session.ExpiresAt).Seconds()),
		"/",
		"",
		false, // Set to true in production with HTTPS
		true,  // HttpOnly
	)

	// Audit log
	_ = h.auditRepo.Create(c.Request.Context(), &user.ID, models.ActionUserLogin,
		middleware.GetClientIP(c), c.Request.UserAgent(), nil)

	userResp := user.ToResponse()
	if mfa != nil {
		userResp.MFAEnabled = mfa.Enabled
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "login successful",
		"user":    userResp,
	})
}

// Logout handles user logout
// @Summary      Logout user
// @Description  Invalidate current session and clear cookie
// @Tags         auth
// @Produce      json
// @Success      200  {object}  map[string]string
// @Failure      401  {object}  map[string]string
// @Failure      500  {object}  map[string]string
// @Router       /auth/logout [post]
func (h *AuthHandler) Logout(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	sessionID, err := middleware.GetSessionID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// Delete session
	if err := h.sessionManager.DeleteSession(c.Request.Context(), sessionID); err != nil {
		h.logger.Error("failed to delete session", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	// Clear cookie
	c.SetCookie("session_id", "", -1, "/", "", false, true)

	// Audit log
	_ = h.auditRepo.Create(c.Request.Context(), &userID, models.ActionUserLogout,
		middleware.GetClientIP(c), c.Request.UserAgent(), nil)

	c.JSON(http.StatusOK, gin.H{"message": "logout successful"})
}

// Me returns current user info
// @Summary      Get current user
// @Description  Get information about the currently logged-in user
// @Tags         auth
// @Produce      json
// @Success      200  {object}  models.UserResponse
// @Failure      401  {object}  map[string]string
// @Failure      500  {object}  map[string]string
// @Router       /auth/me [get]
func (h *AuthHandler) Me(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	user, err := h.userRepo.GetByID(c.Request.Context(), userID)
	if err != nil {
		h.logger.Error("failed to get user", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	mfa, err := h.mfaRepo.GetByUserID(c.Request.Context(), userID)
	if err != nil {
		h.logger.Error("failed to get mfa status", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	resp := user.ToResponse()
	if mfa != nil {
		resp.MFAEnabled = mfa.Enabled
	}

	c.JSON(http.StatusOK, resp)
}

// SetupMFA initiates MFA setup
// @Summary      Setup MFA
// @Description  Generate TOTP secret and QR code
// @Tags         auth
// @Produce      json
// @Success      200  {object}  models.MFASetupResponse
// @Failure      401  {object}  map[string]string
// @Failure      500  {object}  map[string]string
// @Router       /auth/mfa/setup [post]
func (h *AuthHandler) SetupMFA(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	user, err := h.userRepo.GetByID(c.Request.Context(), userID)
	if err != nil {
		h.logger.Error("failed to get user", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	// Check if MFA is already enabled
	existingMFA, _ := h.mfaRepo.GetByUserID(c.Request.Context(), userID)
	if existingMFA != nil && existingMFA.Enabled {
		c.JSON(http.StatusBadRequest, gin.H{"error": "MFA is already enabled"})
		return
	}

	// Generate TOTP key
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "PWManager",
		AccountName: user.Email,
	})
	if err != nil {
		h.logger.Error("failed to generate totp key", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	// Encrypt secret
	encryptedSecret, err := crypto.Encrypt([]byte(key.Secret()), h.encryptionKey)
	if err != nil {
		h.logger.Error("failed to encrypt secret", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	// Prepare MFA secret (persist after backup codes are added)
	mfa := &models.MFASecret{
		UserID:              userID,
		TOTPSecretEncrypted: encryptedSecret,
		Method:              "totp",
		Enabled:             false,
	}

	// Generate backup codes (10 codes, 8 chars each)
	backupCodes, err := generateBackupCodes(10)
	if err != nil {
		h.logger.Error("failed to generate backup codes", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	// Encrypt backup codes as comma-separated string
	encryptedBackupCodes, err := crypto.Encrypt([]byte(strings.Join(backupCodes, ",")), h.encryptionKey)
	if err != nil {
		h.logger.Error("failed to encrypt backup codes", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	mfa.BackupCodesEncrypted = encryptedBackupCodes

	// Persist MFA secret with backup codes
	if existingMFA != nil {
		mfa.ID = existingMFA.ID
		err = h.mfaRepo.Update(c.Request.Context(), mfa)
	} else {
		err = h.mfaRepo.Create(c.Request.Context(), mfa)
	}

	if err != nil {
		h.logger.Error("failed to save mfa secret", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	// Generate QR code
	var buf bytes.Buffer
	img, err := key.Image(200, 200)
	if err != nil {
		h.logger.Error("failed to generate qr code image", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	if err := png.Encode(&buf, img); err != nil {
		h.logger.Error("failed to encode qr code", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	qrCodeBase64 := base64.StdEncoding.EncodeToString(buf.Bytes())

	// Audit log
	_ = h.auditRepo.Create(c.Request.Context(), &userID, models.ActionMFASetup,
		middleware.GetClientIP(c), c.Request.UserAgent(), nil)

	c.JSON(http.StatusOK, models.MFASetupResponse{
		Secret:      key.Secret(),
		QRCode:      qrCodeBase64, // raw base64, frontend prepends data URI
		BackupCodes: backupCodes,
	})
}

// VerifyMFA verifies MFA setup and enables it
// @Summary      Verify MFA
// @Description  Verify TOTP code and enable MFA
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        request body models.MFAVerifyRequest true "Verify Request"
// @Success      200  {object}  map[string]string
// @Failure      400  {object}  map[string]string
// @Failure      401  {object}  map[string]string
// @Failure      500  {object}  map[string]string
// @Router       /auth/mfa/verify [post]
func (h *AuthHandler) VerifyMFA(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req models.MFAVerifyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request: " + err.Error()})
		return
	}

	mfa, err := h.mfaRepo.GetByUserID(c.Request.Context(), userID)
	if err != nil {
		h.logger.Error("failed to get mfa secret", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	if mfa == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "MFA setup not initiated"})
		return
	}

	// Decrypt secret
	secretBytes, err := crypto.Decrypt(mfa.TOTPSecretEncrypted, h.encryptionKey)
	if err != nil {
		h.logger.Error("failed to decrypt secret", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	// Validate code
	valid := totp.Validate(req.Code, string(secretBytes))
	if !valid {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid code"})
		_ = h.auditRepo.Create(c.Request.Context(), &userID, models.ActionMFAFailed,
			middleware.GetClientIP(c), c.Request.UserAgent(), nil)
		return
	}

	// Enable MFA
	mfa.Enabled = true
	if err := h.mfaRepo.Update(c.Request.Context(), mfa); err != nil {
		h.logger.Error("failed to enable mfa", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	// Audit log
	_ = h.auditRepo.Create(c.Request.Context(), &userID, models.ActionMFAVerified,
		middleware.GetClientIP(c), c.Request.UserAgent(), nil)
	_ = h.auditRepo.Create(c.Request.Context(), &userID, models.ActionMFAEnabled,
		middleware.GetClientIP(c), c.Request.UserAgent(), nil)

	c.JSON(http.StatusOK, gin.H{"message": "MFA enabled successfully"})
}

// DisableMFA disables MFA
// @Summary      Disable MFA
// @Description  Disable MFA for the user
// @Tags         auth
// @Produce      json
// @Success      200  {object}  map[string]string
// @Failure      401  {object}  map[string]string
// @Failure      500  {object}  map[string]string
// @Router       /auth/mfa/disable [post]
func (h *AuthHandler) DisableMFA(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	if err := h.mfaRepo.Delete(c.Request.Context(), userID); err != nil {
		h.logger.Error("failed to disable mfa", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	// Audit log
	_ = h.auditRepo.Create(c.Request.Context(), &userID, models.ActionMFADisabled,
		middleware.GetClientIP(c), c.Request.UserAgent(), nil)

	c.JSON(http.StatusOK, gin.H{"message": "MFA disabled successfully"})
}

// generateBackupCodes creates n random, uppercase hex codes (length ~10)
func generateBackupCodes(n int) ([]string, error) {
	codes := make([]string, n)

	for i := 0; i < n; i++ {
		buf := make([]byte, 5)
		if _, err := rand.Read(buf); err != nil {
			return nil, err
		}
		codes[i] = fmt.Sprintf("%X", buf)
	}

	return codes, nil
}
