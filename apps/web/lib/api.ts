import axios from 'axios'

// Use relative URLs for Next.js API routes in production, localhost for development
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '' // Use relative URLs in production (Next.js API routes)
  : (process.env.NEXT_PUBLIC_API_URL || '')

// Create axios instance with default config
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 3000, // 3 second timeout for faster fallback
})

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = typeof window !== 'undefined' ? localStorage.getItem('yahuti_token') : null
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      if (typeof window !== 'undefined') {
        localStorage.removeItem('yahuti_token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// API endpoints
export const apiEndpoints = {
  // KPI endpoints
  kpis: {
    getAll: () => api.get('/api/kpis'),
    getToday: () => api.get('/api/kpis/today'),
    getMTD: () => api.get('/api/kpis/mtd'),
    getYTD: () => api.get('/api/kpis/ytd'),
  },
  
  // System endpoints
  system: {
    getStatus: () => api.get('/api/system/status'),
    getHealth: () => api.get('/api/system/health'),
    getLogs: (limit = 100) => api.get(`/api/system/logs?limit=${limit}`),
  },
  
  // Control endpoints
  control: {
    start: () => api.post('/api/control/start'),
    pause: () => api.post('/api/control/pause'),
    stop: () => api.post('/api/control/stop'),
    withdraw: (amount: number) => api.post('/api/control/withdraw', { amount }),
  },
  
  // Trade endpoints
  trades: {
    getRecent: (limit = 10) => api.get(`/api/trades/recent?limit=${limit}`),
    getHistory: (page = 1, limit = 50) => api.get(`/api/trades/history?page=${page}&limit=${limit}`),
    getById: (id: string) => api.get(`/api/trades/${id}`),
  },
  
  // Alerts endpoints
  alerts: {
    getRecent: (limit = 10) => api.get(`/api/alerts/recent?limit=${limit}`),
    markRead: (id: string) => api.patch(`/api/alerts/${id}/read`),
    markAllRead: () => api.patch('/api/alerts/read-all'),
  },
  
  // Risk management endpoints
  risk: {
    getMetrics: () => api.get('/api/risk/metrics'),
    getExposure: () => api.get('/api/risk/exposure'),
    updateLimits: (limits: any) => api.patch('/api/risk/limits', limits),
  },
  
  // Market data endpoints
  market: {
    getEdge: () => api.get('/api/market/edge'),
    getOpportunities: () => api.get('/api/market/opportunities'),
    getMarketStatus: () => api.get('/api/market/status'),
  },
  
  // Vault endpoints
  vault: {
    getBalance: () => api.get('/api/vault/balance'),
    getTransactions: (limit = 50) => api.get(`/api/vault/transactions?limit=${limit}`),
    deposit: (amount: number) => api.post('/api/vault/deposit', { amount }),
    withdraw: (amount: number) => api.post('/api/vault/withdraw', { amount }),
  },
}

// Utility functions
export async function handleApiResponse<T>(
  apiCall: () => Promise<any>
): Promise<{ data: T | null; error: string | null }> {
  try {
    const response = await apiCall()
    return { data: response.data, error: null }
  } catch (error: any) {
    console.error('API Error:', error)
    return { 
      data: null, 
      error: error.response?.data?.message || error.message || 'An unknown error occurred' 
    }
  }
}

export default api