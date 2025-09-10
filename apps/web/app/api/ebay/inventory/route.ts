import { NextResponse } from 'next/server'
import { makeeBayApiCall, geteBayInventory, createeBayInventoryItem } from '@/lib/ebay-api'
import { cookies } from 'next/headers'

const EBAY_BASE_URL = 'https://api.sandbox.ebay.com'
const APP_ID = process.env.EBAY_CLIENT_ID

interface eBayInventoryItem {
  sku: string
  title: string
  description: string
  price: number
  currency: string
  quantity: number
  condition: string
  category: string
  images: string[]
  status: 'active' | 'inactive' | 'draft'
  created: string
  updated: string
}

// Mock inventory data for sandbox simulation
const mockInventory: eBayInventoryItem[] = [
  {
    sku: 'YAHUTI-001',
    title: 'Apple iPhone 15 Pro Max 256GB - Natural Titanium',
    description: 'Brand new iPhone 15 Pro Max with advanced camera system and titanium design.',
    price: 1199.99,
    currency: 'USD',
    quantity: 5,
    condition: 'New',
    category: 'Cell Phones & Smartphones',
    images: ['https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=400&fit=crop'],
    status: 'active',
    created: '2024-01-15T10:00:00Z',
    updated: '2024-01-20T15:30:00Z'
  },
  {
    sku: 'YAHUTI-002',
    title: 'MacBook Pro 16" M3 Max 64GB RAM 2TB SSD',
    description: 'Professional laptop with M3 Max chip, perfect for development and creative work.',
    price: 3999.00,
    currency: 'USD',
    quantity: 2,
    condition: 'New',
    category: 'Laptops & Netbooks',
    images: ['https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400&h=400&fit=crop'],
    status: 'active',
    created: '2024-01-10T09:00:00Z',
    updated: '2024-01-18T12:15:00Z'
  },
  {
    sku: 'YAHUTI-003',
    title: 'Sony PlayStation 5 Console + Extra Controller',
    description: 'Gaming console with haptic feedback controller and 4K gaming capability.',
    price: 549.99,
    currency: 'USD',
    quantity: 0,
    condition: 'New',
    category: 'Video Game Consoles',
    images: ['https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400&h=400&fit=crop'],
    status: 'inactive',
    created: '2024-01-05T14:30:00Z',
    updated: '2024-01-22T11:45:00Z'
  },
  {
    sku: 'YAHUTI-004',
    title: 'Samsung Galaxy S24 Ultra 512GB Titanium Gray',
    description: 'Premium smartphone with S Pen and advanced camera features.',
    price: 1099.99,
    currency: 'USD',
    quantity: 8,
    condition: 'New',
    category: 'Cell Phones & Smartphones',
    images: ['https://images.unsplash.com/photo-1610792516307-fb72d2e80e2d?w=400&h=400&fit=crop'],
    status: 'active',
    created: '2024-01-12T16:20:00Z',
    updated: '2024-01-19T09:10:00Z'
  },
  {
    sku: 'YAHUTI-005',
    title: 'Nintendo Switch OLED Pokemon Scarlet Bundle',
    description: 'Gaming console with Pokemon Scarlet game and enhanced OLED display.',
    price: 379.95,
    currency: 'USD',
    quantity: 12,
    condition: 'New',
    category: 'Video Game Consoles',
    images: ['https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=400&h=400&fit=crop'],
    status: 'draft',
    created: '2024-01-08T13:45:00Z',
    updated: '2024-01-21T17:25:00Z'
  }
]

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    
    console.log('Fetching eBay inventory...')
    
    // Check if user is authenticated
    const cookieStore = cookies()
    const accessToken = cookieStore.get('ebay_access_token')?.value
    const tokenExpires = cookieStore.get('ebay_token_expires')?.value
    
    const isAuthenticated = accessToken && tokenExpires && Date.now() < parseInt(tokenExpires)
    
    if (isAuthenticated) {
      // Use real eBay Inventory API
      const response = await geteBayInventory({ limit: 100 })
      
      if (response.success && response.data) {
        const inventoryItems = response.data.inventoryItems || []
        
        // Transform eBay API response to our format
        const transformedItems: eBayInventoryItem[] = inventoryItems.map((item: any) => ({
          sku: item.sku,
          title: item.product?.title || 'Untitled Item',
          description: item.product?.description || '',
          price: item.offers?.[0]?.price?.value ? parseFloat(item.offers[0].price.value) : 0,
          currency: item.offers?.[0]?.price?.currency || 'USD',
          quantity: item.availability?.shipToLocationAvailability?.quantity || 0,
          condition: item.condition || 'NEW',
          category: item.product?.aspects?.Brand?.[0] || 'Uncategorized',
          images: item.product?.imageUrls || [],
          status: item.availability?.shipToLocationAvailability?.quantity > 0 ? 'active' : 'inactive',
          created: item.product?.createdDate || new Date().toISOString(),
          updated: item.product?.lastModified || new Date().toISOString()
        }))
        
        // Apply filters
        let filteredInventory = [...transformedItems]
        
        if (status && status !== 'all') {
          filteredInventory = filteredInventory.filter(item => item.status === status)
        }
        
        if (search) {
          const searchLower = search.toLowerCase()
          filteredInventory = filteredInventory.filter(item => 
            item.title.toLowerCase().includes(searchLower) ||
            item.sku.toLowerCase().includes(searchLower) ||
            item.category.toLowerCase().includes(searchLower)
          )
        }
        
        // Calculate stats
        const stats = {
          total: transformedItems.length,
          active: transformedItems.filter(item => item.status === 'active').length,
          inactive: transformedItems.filter(item => item.status === 'inactive').length,
          draft: transformedItems.filter(item => item.status === 'draft').length,
          totalValue: transformedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
          totalQuantity: transformedItems.reduce((sum, item) => sum + item.quantity, 0)
        }
        
        return NextResponse.json({
          success: true,
          items: filteredInventory,
          stats,
          dataSource: 'eBay Inventory API',
          note: 'Real inventory data from eBay'
        })
      }
      
      // If API call failed, fall back to simulation
      console.log('eBay Inventory API call failed, falling back to simulation')
    }
    
    // Use mock data (original simulation code)
    let filteredInventory = [...mockInventory]
    
    // Filter by status
    if (status && status !== 'all') {
      filteredInventory = filteredInventory.filter(item => item.status === status)
    }
    
    // Filter by search term
    if (search) {
      const searchLower = search.toLowerCase()
      filteredInventory = filteredInventory.filter(item => 
        item.title.toLowerCase().includes(searchLower) ||
        item.sku.toLowerCase().includes(searchLower) ||
        item.category.toLowerCase().includes(searchLower)
      )
    }
    
    // Calculate summary stats
    const stats = {
      total: mockInventory.length,
      active: mockInventory.filter(item => item.status === 'active').length,
      inactive: mockInventory.filter(item => item.status === 'inactive').length,
      draft: mockInventory.filter(item => item.status === 'draft').length,
      totalValue: mockInventory.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      totalQuantity: mockInventory.reduce((sum, item) => sum + item.quantity, 0)
    }
    
    return NextResponse.json({
      success: true,
      items: filteredInventory,
      stats,
      dataSource: isAuthenticated ? 'eBay API (Fallback Simulation)' : 'eBay Sandbox Simulation',
      note: isAuthenticated ? 'Connected to eBay but using fallback data' : 'Authenticate to access real inventory data'
    })
    
  } catch (error) {
    console.error('eBay inventory API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch inventory',
      items: [],
      stats: { total: 0, active: 0, inactive: 0, draft: 0, totalValue: 0, totalQuantity: 0 }
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    console.log('Creating/updating eBay inventory item:', body.sku)
    
    // Check if user is authenticated
    const cookieStore = cookies()
    const accessToken = cookieStore.get('ebay_access_token')?.value
    const tokenExpires = cookieStore.get('ebay_token_expires')?.value
    
    const isAuthenticated = accessToken && tokenExpires && Date.now() < parseInt(tokenExpires)
    
    if (isAuthenticated) {
      // Use real eBay Inventory API
      const inventoryItem = {
        sku: body.sku || `YAHUTI-${Date.now()}`,
        product: {
          title: body.title || 'New Item',
          description: body.description || 'Item description',
          imageUrls: body.images || [],
          aspects: {
            Brand: [body.brand || 'Generic'],
            Type: [body.category || 'Other']
          }
        },
        condition: body.condition?.toUpperCase() || 'NEW',
        availability: {
          shipToLocationAvailability: {
            quantity: body.quantity || 0
          }
        },
        packageWeightAndSize: {
          packageType: 'CUSTOM',
          weight: {
            value: body.weight || 1,
            unit: 'POUND'
          },
          dimensions: {
            height: body.height || 6,
            width: body.width || 6,
            length: body.length || 6,
            unit: 'INCH'
          }
        }
      }
      
      const response = await createeBayInventoryItem(inventoryItem)
      
      if (response.success) {
        return NextResponse.json({
          success: true,
          item: {
            sku: inventoryItem.sku,
            title: inventoryItem.product.title,
            description: inventoryItem.product.description,
            price: body.price || 0,
            currency: body.currency || 'USD',
            quantity: body.quantity || 0,
            condition: body.condition || 'New',
            category: body.category || 'Other',
            images: inventoryItem.product.imageUrls,
            status: 'draft',
            created: new Date().toISOString(),
            updated: new Date().toISOString()
          },
          message: 'Item created successfully in eBay',
          dataSource: 'eBay Inventory API'
        })
      } else {
        console.log('eBay Inventory API creation failed, falling back to simulation')
      }
    }
    
    // Fallback to simulation
    const newItem: eBayInventoryItem = {
      sku: body.sku || `YAHUTI-${Date.now()}`,
      title: body.title || 'New Item',
      description: body.description || 'Item description',
      price: body.price || 0,
      currency: body.currency || 'USD',
      quantity: body.quantity || 0,
      condition: body.condition || 'New',
      category: body.category || 'Other',
      images: body.images || [],
      status: body.status || 'draft',
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    }
    
    return NextResponse.json({
      success: true,
      item: newItem,
      message: 'Item saved successfully',
      dataSource: isAuthenticated ? 'eBay API (Fallback Simulation)' : 'eBay Sandbox Simulation'
    })
    
  } catch (error) {
    console.error('eBay inventory creation error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save item'
    }, { status: 500 })
  }
}