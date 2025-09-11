import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const G2A_BASE_URL = 'https://sandboxapi.g2a.com/v1'
const CLIENT_ID = 'qdaiciDiyMaTjxMt'
const API_KEY = '74026b3dc2c6db6a30a73e71cdb138b1e1b5eb7a97ced46689e2d28db1050875'

async function fetchG2AProducts() {
  try {
    const response = await fetch(`${G2A_BASE_URL}/products?page=1&minQty=1`, {
      headers: {
        'Authorization': `${CLIENT_ID}, ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Failed to fetch G2A products:', error)
    return null
  }
}

export async function GET() {
  try {
    const productsData = await fetchG2AProducts()
    
    if (!productsData) {
      return NextResponse.json({
        totalProducts: 0,
        topProducts: [],
        platformBreakdown: {},
        averagePrice: 0,
        lastUpdated: new Date().toISOString(),
        error: 'Failed to load G2A data'
      })
    }

    const topProducts = productsData.docs?.slice(0, 5).map((product: any, index: number) => ({
      id: product.id,
      name: product.name,
      price: product.minPrice,
      platform: product.platform || 'Unknown',
      thumbnail: `https://picsum.photos/58/58?random=${100 + index}`,
      availableToBuy: product.availableToBuy,
      qty: product.qty
    })) || []

    // Calculate platform breakdown
    const platformBreakdown: Record<string, number> = {}
    productsData.docs?.forEach((product: any) => {
      const platform = product.platform || 'Unknown'
      platformBreakdown[platform] = (platformBreakdown[platform] || 0) + 1
    })

    const averagePrice = topProducts.reduce((sum: number, p: any) => sum + (p.price || 0), 0) / (topProducts.length || 1)

    return NextResponse.json({
      totalProducts: productsData.total || 0,
      topProducts,
      platformBreakdown,
      averagePrice: Math.round(averagePrice * 100) / 100,
      lastUpdated: new Date().toISOString()
    })
  } catch (error) {
    console.error('G2A API route error:', error)
    return NextResponse.json({
      totalProducts: 0,
      topProducts: [],
      platformBreakdown: {},
      averagePrice: 0,
      lastUpdated: new Date().toISOString(),
      error: 'Failed to load G2A data'
    }, { status: 500 })
  }
}