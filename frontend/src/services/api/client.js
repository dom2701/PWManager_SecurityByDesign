/**
 * API Client for backend communication
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

/**
 * Fetch wrapper with error handling
 */
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`
  
  const config = {
    credentials: 'include', // Send cookies with requests
    headers: {
      'Content-Type': 'application/json',
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
      const error = new Error(data?.error || data?.message || 'API Error')
      error.status = response.status
      error.data = data
      throw error
    }

    return data
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err)
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
