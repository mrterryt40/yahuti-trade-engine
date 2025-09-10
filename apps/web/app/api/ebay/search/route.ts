import { NextResponse } from 'next/server'

const EBAY_BASE_URL = 'https://api.sandbox.ebay.com'
const APP_ID = 'TerryTay-YahutiTr-SBX-5115bff8e-83abae7a'

interface eBaySearchItem {
  itemId: string[]
  title: string[]
  primaryCategory: {
    categoryId: string[]
    categoryName: string[]
  }[]
  currentPrice: {
    value: string[]
    currencyId: string[]
  }[]
  condition: {
    conditionId: string[]
    conditionDisplayName: string[]
  }[]
  listingInfo: {
    listingType: string[]
    buyItNowAvailable: string[]
    endTime: string[]
  }[]
  galleryURL?: string[]
  viewItemURL: string[]
  location: string[]
  country: string[]
  shippingInfo: {
    shippingServiceCost: {
      value: string[]
      currencyId: string[]
    }[]
    shippingType: string[]
  }[]
}

interface eBaySearchResponse {
  findItemsByKeywordsResponse: [{
    ack: string[]
    version: string[]
    timestamp: string[]
    searchResult: [{
      count: string[]
      item?: eBaySearchItem[]
    }]
    paginationOutput: [{
      pageNumber: string[]
      entriesPerPage: string[]
      totalPages: string[]
      totalEntries: string[]
    }]
  }]
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const keywords = searchParams.get('keywords') || 'iPhone'
    const categoryId = searchParams.get('categoryId') || ''
    const minPrice = searchParams.get('minPrice') || ''
    const maxPrice = searchParams.get('maxPrice') || ''
    const sortOrder = searchParams.get('sortOrder') || 'BestMatch'
    const entriesPerPage = searchParams.get('limit') || '10'

    // Build eBay API URL
    const params = new URLSearchParams({
      'OPERATION-NAME': 'findItemsByKeywords',
      'SERVICE-VERSION': '1.0.0',
      'SECURITY-APPNAME': APP_ID,
      'RESPONSE-DATA-FORMAT': 'JSON',
      'REST-PAYLOAD': 'true',
      'keywords': keywords,
      'paginationInput.entriesPerPage': entriesPerPage,
      'sortOrder': sortOrder,
    })

    if (categoryId) {
      params.append('categoryId', categoryId)
    }

    if (minPrice && maxPrice) {
      params.append('itemFilter(0).name', 'Price')
      params.append('itemFilter(0).value(0)', minPrice)
      params.append('itemFilter(0).value(1)', maxPrice)
      params.append('itemFilter(0).paramName', 'Currency')
      params.append('itemFilter(0).paramValue', 'USD')
    }

    // Add condition filter for new items
    params.append('itemFilter(1).name', 'Condition')
    params.append('itemFilter(1).value', 'New')

    // Add listing type filter
    params.append('itemFilter(2).name', 'ListingType')
    params.append('itemFilter(2).value(0)', 'FixedPrice')
    params.append('itemFilter(2).value(1)', 'Auction')

    const url = `${EBAY_BASE_URL}/services/search/FindingService/v1?${params.toString()}`
    
    const response = await fetch(url, {
      headers: {
        'X-EBAY-SOA-SECURITY-APPNAME': APP_ID,
      },
    })

    if (!response.ok) {
      throw new Error(`eBay API error! status: ${response.status}`)
    }

    const data: eBaySearchResponse = await response.json()
    
    // Check if the response has an error
    if (data.findItemsByKeywordsResponse[0].ack[0] !== 'Success') {
      throw new Error('eBay API returned error')
    }

    const searchResult = data.findItemsByKeywordsResponse[0].searchResult[0]
    const items = searchResult.item || []
    
    // Transform eBay data to our format
    const transformedItems = items.map(item => ({
      id: item.itemId[0],
      title: item.title[0],
      price: parseFloat(item.currentPrice[0].value[0]),
      currency: item.currentPrice[0].currencyId[0],
      condition: item.condition?.[0]?.conditionDisplayName?.[0] || 'Unknown',
      listingType: item.listingInfo[0].listingType[0],
      endTime: item.listingInfo[0].endTime[0],
      imageUrl: item.galleryURL?.[0] || '',
      viewUrl: item.viewItemURL[0],
      location: item.location[0],
      country: item.country[0],
      category: {
        id: item.primaryCategory[0].categoryId[0],
        name: item.primaryCategory[0].categoryName[0]
      },
      shipping: {
        cost: item.shippingInfo[0].shippingServiceCost?.[0]?.value?.[0] ? 
               parseFloat(item.shippingInfo[0].shippingServiceCost[0].value[0]) : 0,
        type: item.shippingInfo[0].shippingType[0]
      }
    }))

    const pagination = data.findItemsByKeywordsResponse[0].paginationOutput[0]

    return NextResponse.json({
      success: true,
      items: transformedItems,
      pagination: {
        currentPage: parseInt(pagination.pageNumber[0]),
        itemsPerPage: parseInt(pagination.entriesPerPage[0]),
        totalPages: parseInt(pagination.totalPages[0]),
        totalItems: parseInt(pagination.totalEntries[0])
      },
      searchInfo: {
        keywords,
        timestamp: new Date().toISOString()
      }
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