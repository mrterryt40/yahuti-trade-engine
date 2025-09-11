import { NextResponse } from 'next/server'
import { searcheBayItems } from '@/lib/ebay-api'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const keywords = searchParams.get('keywords') || searchParams.get('q') || 'iPhone'
    const categoryId = searchParams.get('categoryId') || searchParams.get('category_id')
    const minPrice = searchParams.get('minPrice') || searchParams.get('min_price')
    const maxPrice = searchParams.get('maxPrice') || searchParams.get('max_price')
    const sortOrder = searchParams.get('sortOrder') || searchParams.get('sort') || 'BestMatch'
    const limit = searchParams.get('limit') || '10'

    console.log(`Searching eBay for: ${keywords}`)

    // Try eBay Browse API Search with App Token
    const response = await searcheBayItems(keywords, {
      categoryId: categoryId || undefined,
      minPrice: minPrice || undefined,
      maxPrice: maxPrice || undefined,
      sortOrder,
      limit
    })

    if (response.success && response.data) {
      const searchResult = response.data
      const items = searchResult.itemSummaries || []
      
      // Transform eBay Browse API response to our format
      const transformedItems = items.map((item: any) => ({
        id: item.itemId,
        title: item.title,
        price: item.price ? parseFloat(item.price.value) : 0,
        currency: item.price?.currency || 'USD',
        condition: item.condition || 'Unknown',
        listingType: item.buyingOptions?.[0] || 'FixedPrice',
        imageUrl: item.image?.imageUrl || '',
        viewUrl: item.itemWebUrl,
        location: item.itemLocation?.city || 'Unknown',
        country: item.itemLocation?.country || 'US',
        category: {
          id: item.categories?.[0]?.categoryId || '',
          name: item.categories?.[0]?.categoryName || 'Other'
        },
        shipping: {
          cost: item.shippingOptions?.[0]?.shippingCost ? 
                 parseFloat(item.shippingOptions[0].shippingCost.value) : 0,
          type: item.shippingOptions?.[0]?.shippingCostType || 'Unknown'
        },
        seller: {
          username: item.seller?.username || 'Unknown',
          feedbackScore: item.seller?.feedbackScore || 0
        }
      }))

      return NextResponse.json({
        success: true,
        items: transformedItems,
        pagination: {
          currentPage: 1,
          itemsPerPage: transformedItems.length,
          totalPages: Math.ceil((searchResult.total || transformedItems.length) / parseInt(limit)),
          totalItems: searchResult.total || transformedItems.length
        },
        searchInfo: {
          keywords,
          timestamp: new Date().toISOString()
        },
        dataSource: 'eBay Browse API'
      })
    }

    // If Browse API fails, fall back to simulation
    console.log(`eBay Browse API search failed for "${keywords}", providing simulation`)
    
    // Generate realistic test data based on search keywords
    const mockItems = [
      {
        id: `${Date.now()}-1`,
        title: `${keywords} - Premium Quality`,
        price: Math.round((Math.random() * 500 + 50) * 100) / 100,
        currency: 'USD',
        condition: 'New',
        listingType: 'FixedPrice',
        imageUrl: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop',
        viewUrl: `https://www.ebay.com/itm/${Date.now()}-1`,
        location: 'San Francisco',
        country: 'US',
        category: { id: '9355', name: 'Electronics' },
        shipping: { cost: 9.99, type: 'Standard' },
        seller: { username: 'test_seller_1', feedbackScore: 98.5 }
      },
      {
        id: `${Date.now()}-2`,
        title: `${keywords} - Best Deal`,
        price: Math.round((Math.random() * 300 + 25) * 100) / 100,
        currency: 'USD',
        condition: 'Used',
        listingType: 'Auction',
        imageUrl: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop',
        viewUrl: `https://www.ebay.com/itm/${Date.now()}-2`,
        location: 'New York',
        country: 'US',
        category: { id: '9355', name: 'Electronics' },
        shipping: { cost: 0, type: 'Free' },
        seller: { username: 'bargain_hunter', feedbackScore: 95.2 }
      }
    ]

    return NextResponse.json({
      success: true,
      items: mockItems,
      pagination: {
        currentPage: 1,
        itemsPerPage: mockItems.length,
        totalPages: 1,
        totalItems: mockItems.length
      },
      searchInfo: {
        keywords,
        timestamp: new Date().toISOString()
      },
      dataSource: 'eBay Sandbox Simulation',
      note: 'eBay Browse API not available - showing test data. Add EBAY_APP_TOKEN to use real search.'
    })

  } catch (error) {
    console.error('eBay search API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search eBay',
      items: [],
      pagination: {
        currentPage: 1,
        itemsPerPage: 0,
        totalPages: 0,
        totalItems: 0
      }
    }, { status: 500 })
  }
}