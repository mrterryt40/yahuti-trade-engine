import { useState, useEffect } from 'react'

export interface eBayUser {
  userId: string
  username: string
  firstName?: string
  lastName?: string
  email?: string
}

export interface eBayAuthStatus {
  authenticated: boolean
  user?: eBayUser
  tokenInfo?: {
    expiresAt: string
    expiresIn: number
  }
  expired?: boolean
  invalid?: boolean
}

export function useeBayAuth() {
  const [authStatus, setAuthStatus] = useState<eBayAuthStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/ebay/oauth/status')
      const data = await response.json()
      
      if (data.success) {
        setAuthStatus({
          authenticated: data.authenticated,
          user: data.user,
          tokenInfo: data.tokenInfo
        })
      } else {
        setAuthStatus({
          authenticated: false,
          expired: data.expired,
          invalid: data.invalid
        })
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check auth status'
      setError(errorMessage)
      setAuthStatus({ authenticated: false })
    } finally {
      setIsLoading(false)
    }
  }

  const initiateAuth = async (scopes?: string) => {
    try {
      setError(null)
      
      // Use direct redirect to OAuth start endpoint for true browser navigation
      window.location.href = '/api/ebay/oauth/start'
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initiate auth'
      setError(errorMessage)
    }
  }

  const refreshToken = async () => {
    try {
      setError(null)
      
      const response = await fetch('/api/ebay/oauth/refresh', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Refresh the auth status after successful token refresh
        await checkAuthStatus()
        return true
      } else {
        throw new Error(data.error || 'Failed to refresh token')
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh token'
      setError(errorMessage)
      return false
    }
  }

  const logout = async () => {
    try {
      // Clear cookies by setting expired date
      document.cookie = 'ebay_access=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      document.cookie = 'ebay_refresh=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      document.cookie = 'ebay_exp=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      
      setAuthStatus({ authenticated: false })
      setError(null)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to logout'
      setError(errorMessage)
    }
  }

  // Auto-refresh token if it's about to expire
  useEffect(() => {
    if (authStatus?.authenticated && authStatus.tokenInfo) {
      const { expiresIn } = authStatus.tokenInfo
      
      // Refresh token when 5 minutes remaining
      if (expiresIn > 0 && expiresIn < 300) {
        refreshToken()
      }
    }
  }, [authStatus])

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus()
  }, [])

  // Check for auth callback parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const authSuccess = urlParams.get('auth')
    const authError = urlParams.get('error')
    
    if (authSuccess === 'ok') {
      // Clean up URL and refresh auth status
      window.history.replaceState({}, document.title, window.location.pathname)
      checkAuthStatus()
    } else if (authSuccess === 'error' || authSuccess === 'failed' || authError) {
      setError(authError ? decodeURIComponent(authError) : 'Authentication failed')
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  return {
    authStatus,
    isLoading,
    error,
    initiateAuth,
    refreshToken,
    logout,
    checkAuthStatus,
    isAuthenticated: authStatus?.authenticated || false,
    user: authStatus?.user,
    needsAuth: !isLoading && !authStatus?.authenticated
  }
}