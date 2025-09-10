import { NextResponse } from 'next/server'

const EBAY_BASE_URL = 'https://api.sandbox.ebay.com'
const APP_ID = 'TerryTay-YahutiTr-SBX-5115bff8e-83abae7a'

interface eBayBrowseItem {
  itemId: string
  title: string
  price: {
    value: string
    currency: string
  }
  condition: string
  categoryPath: string
  itemLocation: {
    country: string
    city?: string
  }
  seller: {
    username: string
    feedbackScore: number
  }
  image: {
    imageUrl: string
  }
  itemWebUrl: string
  shortDescription?: string
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('itemId')
    
    if (!itemId) {
      return NextResponse.json({
        success: false,
        error: 'Item ID is required'
      }, { status: 400 })
    }

    console.log(`Fetching eBay item details for ID: ${itemId}`)

    // Try Browse API first
    const browseUrl = `${EBAY_BASE_URL}/buy/browse/v1/item/${itemId}`
    
    const response = await fetch(browseUrl, {
      headers: {
        'Authorization': `Bearer ${APP_ID}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        'Accept': 'application/json'
      }
    })

    if (response.ok) {
      const data: eBayBrowseItem = await response.json()
      
      return NextResponse.json({
        success: true,
        item: {
          id: data.itemId,
          title: data.title,
          price: parseFloat(data.price.value),
          currency: data.price.currency,
          condition: data.condition,
          category: data.categoryPath,
          location: `${data.itemLocation.city || ''}, ${data.itemLocation.country}`.trim().replace(/^,\s*/, ''),
          seller: {
            username: data.seller.username,
            feedback: data.seller.feedbackScore
          },
          imageUrl: data.image.imageUrl,
          webUrl: data.itemWebUrl,
          description: data.shortDescription || 'No description available'
        },
        dataSource: 'eBay Browse API'
      })
    }

    // If Browse API fails, fall back to simulation
    console.log(`eBay Browse API not available for item ${itemId}, providing simulation`)
    
    // Generate realistic test data based on item ID
    const testItems = [
      {
        id: '12345',
        title: 'Apple iPhone 15 Pro Max 256GB - Natural Titanium',
        price: 1199.99,
        currency: 'USD',
        condition: 'New',
        category: 'Cell Phones & Smartphones',
        location: 'Cupertino, US',
        seller: { username: 'apple_store_official', feedback: 99.8 },
        imageUrl: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=300&h=300&fit=crop',
        webUrl: 'https://www.ebay.com/itm/12345',
        description: 'Brand new iPhone 15 Pro Max with 256GB storage in Natural Titanium finish.'
      },
      {
        id: '67890',
        title: 'MacBook Pro 16" M3 Max 64GB RAM 2TB SSD',
        price: 3999.00,
        currency: 'USD',
        condition: 'New',
        category: 'Laptops & Netbooks',
        location: 'San Francisco, US',
        seller: { username: 'tech_depot_pro', feedback: 98.5 },
        imageUrl: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=300&h=300&fit=crop',
        webUrl: 'https://www.ebay.com/itm/67890',
        description: 'Professional MacBook Pro with M3 Max chip, perfect for development and creative work.'
      }
    ]

    const testItem = testItems.find(item => item.id === itemId) || {
      id: itemId,
      title: `Test Item ${itemId}`,
      price: Math.round((Math.random() * 1000 + 100) * 100) / 100,
      currency: 'USD',
      condition: 'New',
      category: 'Electronics',
      location: 'Test Location, US',
      seller: { username: 'sandbox_seller', feedback: 95.0 },
      imageUrl: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop',
      webUrl: `https://www.ebay.com/itm/${itemId}`,
      description: 'This is a test item from eBay sandbox environment.'
    }

    return NextResponse.json({
      success: true,
      item: testItem,
      dataSource: 'eBay Sandbox Simulation',
      note: 'Browse API not available in sandbox - showing test data'
    })

  } catch (error) {
    console.error('eBay Browse API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch item details',
      dataSource: 'Error'
    }, { status: 500 })
  }
}