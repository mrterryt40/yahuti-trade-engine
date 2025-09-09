import { useState, useEffect } from 'react'

export interface G2AProduct {
  id: string
  name: string
  price: number
  platform: string
  thumbnail: string
  availableToBuy: boolean
  qty: number
}

export interface G2ADashboardStats {
  totalProducts: number
  topProducts: G2AProduct[]
  platformBreakdown: Record<string, number>
  averagePrice: number
  lastUpdated: string
  error?: string
}

export function useG2ADashboard() {
  const [data, setData] = useState<G2ADashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/g2a/dashboard-stats')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.error) {
        setError(result.error)
      }
      
      setData(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch G2A data'
      setError(errorMessage)
      console.error('Failed to fetch G2A dashboard data:', err)
      
      // Set fallback mock data on error
      setData({
        totalProducts: 0,
        topProducts: [],
        platformBreakdown: {},
        averagePrice: 0,
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

export function useG2AProducts(params?: {
  page?: number
  minQty?: number
  category?: string
}) {
  const [products, setProducts] = useState<G2AProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  const fetchProducts = async () => {
    try {
      setIsLoading(true)
      setError(null)

      let url = '/api/g2a/products'
      const queryParams = new URLSearchParams()
      
      if (params?.page) queryParams.append('page', params.page.toString())
      if (params?.minQty) queryParams.append('minQty', params.minQty.toString())
      
      if (queryParams.toString()) {
        url += '?' + queryParams.toString()
      }

      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      setProducts(result.docs || [])
      setTotal(result.total || 0)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch G2A products'
      setError(errorMessage)
      console.error('Failed to fetch G2A products:', err)
      setProducts([])
      setTotal(0)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [params?.page, params?.minQty, params?.category])

  const refetch = () => {
    return fetchProducts()
  }

  return {
    products,
    total,
    isLoading,
    error,
    refetch
  }
}