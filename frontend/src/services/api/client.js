/**
 * API Client for backend communication
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

let csrfToken = null;

export function setCSRFToken(token) {
  csrfToken = token;
}

export function getCSRFToken() {
  return csrfToken;
}

/**
 * Fetch wrapper with error handling
 */
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`
  
  // Check for missing CSRF token on state-changing methods
  if (!csrfToken && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method?.toUpperCase())) {
    console.warn('Making state-changing request without CSRF token')
  }

  const config = {
    credentials: 'include', // Send cookies with requests
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      ...options.headers,
    },
    ...options,
  }

  try {
    const response = await fetch(url, config)
    
    // Try to parse JSON response
    let data
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      data = await response.json()
    } else {
      data = await response.text()
    }

    if (!response.ok) {
      let message = 'API Error'
      if (data && typeof data === 'object') {
        message = data.error || data.message || message
      } else if (typeof data === 'string' && data.trim() !== '') {
        message = data.trim()
      }

      const error = new Error(message)
      error.status = response.status
      error.data = data
      throw error
    }

    return data
  } catch (err) {
    // Sanitize error logging to prevent leaking sensitive data
    const safeError = {
      message: err.message,
      status: err.status,
      endpoint
    }
    console.error(`API Error [${endpoint}]:`, safeError)
    throw err
  }
}

/**
 * GET request
 */
export async function get(endpoint, options = {}) {
  return apiCall(endpoint, {
    method: 'GET',
    ...options,
  })
}

/**
 * POST request
 */
export async function post(endpoint, body, options = {}) {
  return apiCall(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
    ...options,
  })
}

/**
 * PUT request
 */
export async function put(endpoint, body, options = {}) {
  return apiCall(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body),
    ...options,
  })
}

/**
 * DELETE request
 */
export async function del(endpoint, options = {}) {
  return apiCall(endpoint, {
    method: 'DELETE',
    ...options,
  })
}

/**
 * PATCH request
 */
export async function patch(endpoint, body, options = {}) {
  return apiCall(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(body),
    ...options,
  })
}

export default {
  get,
  post,
  put,
  del,
  patch,
}
