package handlers

import (
	"net/http"
	"time"

	"github.com/SecurityByDesign/pwmanager/internal/auth"
	"github.com/SecurityByDesign/pwmanager/internal/middleware"
	"github.com/SecurityByDesign/pwmanager/internal/models"
	"github.com/SecurityByDesign/pwmanager/internal/repository"
	"github.com/SecurityByDesign/pwmanager/pkg/crypto"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// AuthHandler handles authentication-related requests
type AuthHandler struct {
	userRepo       *repository.UserRepository
	auditRepo      *repository.AuditRepository
	sessionManager *auth.SessionManager
	argon2Params   *crypto.Argon2Params
	logger         *zap.Logger
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(
	userRepo *repository.UserRepository,
	auditRepo *repository.AuditRepository,
	sessionManager *auth.SessionManager,
	argon2Params *crypto.Argon2Params,
	logger *zap.Logger,
) *AuthHandler {
	return &AuthHandler{
		userRepo:       userRepo,
		auditRepo:      auditRepo,
		sessionManager: sessionManager,
		argon2Params:   argon2Params,
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

	c.JSON(http.StatusOK, gin.H{
		"message": "login successful",
		"user":    user.ToResponse(),
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

	c.JSON(http.StatusOK, user.ToResponse())
}
