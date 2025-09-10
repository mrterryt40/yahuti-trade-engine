import { useState, useEffect } from 'react'

export interface eBayItem {
  id: string
  title: string
  price: number
  currency: string
  imageUrl?: string
  listingType: string
  location: string
}

export interface eBayDashboardStats {
  success: boolean
  totalListings: number
  featuredProducts: eBayItem[]
  categoryBreakdown: Record<string, number>
  averagePrice: number
  activeAuctions: number
  fixedPriceItems: number
  searchCategories: string[]
  lastUpdated: string
  error?: string
}

export interface eBaySearchResult {
  success: boolean
  items: Array<{
    id: string
    title: string
    price: number
    currency: string
    condition: string
    listingType: string
    endTime: string
    imageUrl: string
    viewUrl: string
    location: string
    country: string
    category: {
      id: string
      name: string
    }
    shipping: {
      cost: number
      type: string
    }
  }>
  pagination: {
    currentPage: number
    itemsPerPage: number
    totalPages: number
    totalItems: number
  }
  searchInfo: {
    keywords: string
    timestamp: string
  }
  error?: string
}

export function useeBayDashboard() {
  const [data, setData] = useState<eBayDashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/ebay/dashboard-stats')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (!result.success && result.error) {
        setError(result.error)
      }
      
      setData(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch eBay data'
      setError(errorMessage)
      console.error('Failed to fetch eBay dashboard data:', err)
      
      // Set fallback mock data on error
      setData({
        success: false,
        totalListings: 0,
        featuredProducts: [],
        categoryBreakdown: {},
        averagePrice: 0,
        activeAuctions: 0,
        fixedPriceItems: 0,
        searchCategories: [],
        lastUpdated: new Date().toISOString(),
        error: errorMessage
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const refetch = () => {
    return fetchData()
  }

  return {
    data,
    isLoading,
    error,
    refetch
  }
}

export function useeBaySearch(params?: {
  keywords?: string
  categoryId?: string
  minPrice?: string
  maxPrice?: string
  sortOrder?: string
  limit?: string
}) {
  const [data, setData] = useState<eBaySearchResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = async (searchParams?: typeof params) => {
    try {
      setIsLoading(true)
      setError(null)

      const actualParams = searchParams || params
      let url = '/api/ebay/search'
      const queryParams = new URLSearchParams()
      
      if (actualParams?.keywords) queryParams.append('keywords', actualParams.keywords)
      if (actualParams?.categoryId) queryParams.append('categoryId', actualParams.categoryId)
      if (actualParams?.minPrice) queryParams.append('minPrice', actualParams.minPrice)
      if (actualParams?.maxPrice) queryParams.append('maxPrice', actualParams.maxPrice)
      if (actualParams?.sortOrder) queryParams.append('sortOrder', actualParams.sortOrder)
      if (actualParams?.limit) queryParams.append('limit', actualParams.limit)
      
      if (queryParams.toString()) {
        url += '?' + queryParams.toString()
      }

      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (!result.success && result.error) {
        setError(result.error)
      }
      
      setData(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search eBay'
      setError(errorMessage)
      console.error('Failed to search eBay:', err)
      setData({
        success: false,
        items: [],
        pagination: {
          currentPage: 1,
          itemsPerPage: 0,
          totalPages: 0,
          totalItems: 0
        },
        searchInfo: {
          keywords: params?.keywords || '',
          timestamp: new Date().toISOString()
        },
        error: errorMessage
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-search on mount if keywords provided
  useEffect(() => {
    if (params?.keywords) {
      search(params)
    }
  }, [params?.keywords])

  return {
    data,
    isLoading,
    error,
    search
  }
}