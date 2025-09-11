import { cookies } from 'next/headers'

const EBAY_BASE_URL_SANDBOX = 'https://api.sandbox.ebay.com'
const EBAY_BASE_URL_PROD = 'https://api.ebay.com'

export interface eBayApiOptions {
  endpoint: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: any
  headers?: Record<string, string>
  useProduction?: boolean
  requiresAuth?: boolean
  useAppToken?: boolean
}

export interface eBayApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  status?: number
}

export async function makeeBayApiCall<T = any>(options: eBayApiOptions): Promise<eBayApiResponse<T>> {
  try {
    const {
      endpoint,
      method = 'GET',
      body,
      headers = {},
      useProduction = false,
      requiresAuth = true,
      useAppToken = false
    } = options

    const baseUrl = useProduction ? EBAY_BASE_URL_PROD : EBAY_BASE_URL_SANDBOX
    const url = `${baseUrl}${endpoint}`

    // Build request headers
    const requestHeaders: Record<string, string> = {
      'Accept': 'application/json',
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
      ...headers
    }

    // Add authentication if required
    if (requiresAuth) {
      const cookieStore = cookies()
      const accessToken = cookieStore.get('ebay_access_token')?.value
      const tokenExpires = cookieStore.get('ebay_token_expires')?.value

      if (!accessToken) {
        return {
          success: false,
          error: 'No access token available. Please authenticate first.',
          status: 401
        }
      }

      // Check if token is expired
      if (tokenExpires && Date.now() > parseInt(tokenExpires)) {
        return {
          success: false,
          error: 'Access token has expired. Please re-authenticate.',
          status: 401
        }
      }

      requestHeaders['Authorization'] = `Bearer ${accessToken}`
    } else if (useAppToken) {
      // Use App Token for guest mode APIs
      const appToken = process.env.EBAY_APP_TOKEN
      
      if (!appToken) {
        return {
          success: false,
          error: 'eBay App Token not configured. Please add EBAY_APP_TOKEN to environment variables.',
          status: 401
        }
      }
      
      requestHeaders['Authorization'] = `Bearer ${appToken}`
    }

    // Add content type for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(method) && body) {
      requestHeaders['Content-Type'] = 'application/json'
    }

    // Make the API call
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    })

    // Parse response
    let responseData: any = null
    const contentType = response.headers.get('content-type')
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json()
    } else {
      responseData = await response.text()
    }

    if (!response.ok) {
      return {
        success: false,
        error: responseData?.message || responseData?.error_description || responseData || `API call failed with status ${response.status}`,
        status: response.status,
        data: responseData
      }
    }

    return {
      success: true,
      data: responseData,
      status: response.status
    }

  } catch (error) {
    console.error('eBay API call error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown API error'
    }
  }
}

// Helper functions for specific eBay APIs

export async function geteBayInventory(params?: { limit?: number; offset?: string }) {
  return makeeBayApiCall({
    endpoint: `/sell/inventory/v1/inventory_item?${new URLSearchParams({
      limit: (params?.limit || 50).toString(),
      ...(params?.offset && { offset: params.offset })
    })}`,
    requiresAuth: true
  })
}

export async function createeBayInventoryItem(item: any) {
  return makeeBayApiCall({
    endpoint: `/sell/inventory/v1/inventory_item/${item.sku}`,
    method: 'PUT',
    body: item,
    requiresAuth: true
  })
}

export async function geteBayOrders(params?: { filter?: string; limit?: number; offset?: string }) {
  const queryParams = new URLSearchParams()
  if (params?.filter) queryParams.append('filter', params.filter)
  if (params?.limit) queryParams.append('limit', params.limit.toString())
  if (params?.offset) queryParams.append('offset', params.offset)

  return makeeBayApiCall({
    endpoint: `/sell/fulfillment/v1/order?${queryParams.toString()}`,
    requiresAuth: true
  })
}

export async function geteBayAnalytics(params?: { 
  metric_keys?: string[]
  dimension?: string
  filter?: string
}) {
  const queryParams = new URLSearchParams()
  if (params?.metric_keys) {
    params.metric_keys.forEach(key => queryParams.append('metric_keys', key))
  }
  if (params?.dimension) queryParams.append('dimension', params.dimension)
  if (params?.filter) queryParams.append('filter', params.filter)

  return makeeBayApiCall({
    endpoint: `/sell/analytics/v1/seller_standards_profile?${queryParams.toString()}`,
    requiresAuth: true
  })
}

export async function geteBayMarketplaceInsights(keywords: string) {
  return makeeBayApiCall({
    endpoint: `/buy/marketplace_insights/v1_beta/item_sales/search?q=${encodeURIComponent(keywords)}&category_ids=9355`,
    requiresAuth: false,
    useAppToken: true
  })
}

export async function searcheBayItems(keywords: string, options?: {
  categoryId?: string
  minPrice?: string
  maxPrice?: string
  sortOrder?: string
  limit?: string
}) {
  const params = new URLSearchParams({
    'q': keywords,
    'limit': options?.limit || '10',
    'sort': options?.sortOrder || 'BestMatch'
  })
  
  if (options?.categoryId) {
    params.append('category_ids', options.categoryId)
  }
  
  if (options?.minPrice && options?.maxPrice) {
    params.append('filter', `price:[${options.minPrice}..${options.maxPrice}]`)
  }
  
  return makeeBayApiCall({
    endpoint: `/buy/browse/v1/item_summary/search?${params.toString()}`,
    requiresAuth: false,
    useAppToken: true
  })
}