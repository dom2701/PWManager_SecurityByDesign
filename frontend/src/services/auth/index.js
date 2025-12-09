/**
 * Authentication Service
 */

import * as api from '../api/client'

/**
 * Login user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise} Login response with session data
 */
export const loginUser = (email, password) => {
  return api.post('/auth/login', {
    email,
    password,
  })
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
  changePassword,
}
