/**
 * Authentication Service
 */

import * as api from '../api/client'

/**
 * Login user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string|undefined} mfaCode - Optional MFA code (6 digits)
 * @returns {Promise} Login response with session data
 */
export const loginUser = (email, password, mfaCode) => {
  const payload = {
    email,
    password,
  }
  if (mfaCode) {
    payload.mfa_code = mfaCode
  }
  return api.post('/auth/login', payload)
}

/**
 * Register new user
 * @param {string} email - User email
 * @param {string} password - User password (12-128 chars)
 * @returns {Promise} Registration response with user data
 */
export const registerUser = (email, password) => {
  // Validate password length
  if (!password || password.length < 12 || password.length > 128) {
    throw new Error('Passwort muss zwischen 12 und 128 Zeichen lang sein')
  }

  return api.post('/auth/register', {
    email,
    password,
  })
}

/**
 * Logout user
 * @returns {Promise} Logout response
 */
export const logoutUser = () => {
  return api.post('/auth/logout', {})
}

/**
 * Get current user profile
 * @returns {Promise} User profile data
 */
export const getCurrentUser = () => {
  return api.get('/auth/me')
}

/**
 * Fetch CSRF token
 * @returns {Promise} CSRF token
 */
export const fetchCSRFToken = async () => {
  try {
    const response = await api.get('/auth/csrf')
    if (response && response.csrf_token) {
      api.setCSRFToken(response.csrf_token)
      return response
    }
    console.error('CSRF token missing in response:', response)
    throw new Error('CSRF token missing in response')
  } catch (err) {
    console.error('Failed to fetch CSRF token:', err)
    throw err
  }
}

/**
 * Change password
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise} Password change response
 */
export const changePassword = (currentPassword, newPassword) => {
  return api.post('/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  })
}

export default {
  loginUser,
  registerUser,
  logoutUser,
  getCurrentUser,
  fetchCSRFToken,
  changePassword,
}
