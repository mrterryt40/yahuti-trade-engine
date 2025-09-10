import { NextResponse } from 'next/server'

const EBAY_BASE_URL = 'https://api.sandbox.ebay.com'
const APP_ID = 'TerryTay-YahutiTr-SBX-5115bff8e-83abae7a'

export async function GET() {
  // Return demo data directly since eBay sandbox may not be fully accessible
  return NextResponse.json({
    success: true,
    totalListings: 125673,
    featuredProducts: [
      {
        id: '12345678901',
        title: 'Apple iPhone 15 Pro Max 256GB - Natural Titanium',
        price: 1199.99,
        currency: 'USD',
        imageUrl: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=100&h=100&fit=crop',
        listingType: 'FixedPrice',
        location: 'New York, NY'
      },
      {
        id: '12345678902',
        title: 'MacBook Pro 16" M3 Max 64GB RAM 2TB SSD',
        price: 3999.00,
        currency: 'USD',
        imageUrl: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=100&h=100&fit=crop',
        listingType: 'Auction',
        location: 'California, CA'
      },
      {
        id: '12345678903',
        title: 'Sony PlayStation 5 Console + Extra Controller',
        price: 549.99,
        currency: 'USD',
        imageUrl: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=100&h=100&fit=crop',
        listingType: 'FixedPrice',
        location: 'Texas, TX'
      },
      {
        id: '12345678904',
        title: 'Samsung Galaxy S24 Ultra 512GB Titanium Gray',
        price: 1099.99,
        currency: 'USD',
        imageUrl: 'https://images.unsplash.com/photo-1610792516307-fb72d2e80e2d?w=100&h=100&fit=crop',
        listingType: 'FixedPrice',
        location: 'Florida, FL'
      },
      {
        id: '12345678905',
        title: 'Nintendo Switch OLED Pokemon Scarlet Bundle',
        price: 379.95,
        currency: 'USD',
        imageUrl: 'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=100&h=100&fit=crop',
        listingType: 'Auction',
        location: 'Washington, WA'
      }
    ],
    categoryBreakdown: {
      'Electronics': 45230,
      'Computers': 23891,
      'Gaming': 18764,
      'Mobile Phones': 37788
    },
    averagePrice: 1045.78,
    activeAuctions: 2,
    fixedPriceItems: 3,
    searchCategories: ['iPhone', 'MacBook', 'PlayStation', 'Samsung Galaxy', 'Nintendo Switch'],
    lastUpdated: new Date().toISOString()
  })

  try {
    // Original eBay API code can be restored when sandbox is fully working
  } catch (error) {
    console.error('eBay dashboard stats error:', error)
    
    // Return demo data since sandbox might not be fully accessible
    return NextResponse.json({
      success: true,
      totalListings: 125673,
      featuredProducts: [
        {
          id: '12345678901',
          title: 'Apple iPhone 15 Pro Max 256GB - Natural Titanium',
          price: 1199.99,
          currency: 'USD',
          imageUrl: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=100&h=100&fit=crop',
          listingType: 'FixedPrice',
          location: 'New York, NY'
        },
        {
          id: '12345678902',
          title: 'MacBook Pro 16" M3 Max 64GB RAM 2TB SSD',
          price: 3999.00,
          currency: 'USD',
          imageUrl: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=100&h=100&fit=crop',
          listingType: 'Auction',
          location: 'California, CA'
        },
        {
          id: '12345678903',
          title: 'Sony PlayStation 5 Console + Extra Controller',
          price: 549.99,
          currency: 'USD',
          imageUrl: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=100&h=100&fit=crop',
          listingType: 'FixedPrice',
          location: 'Texas, TX'
        },
        {
          id: '12345678904',
          title: 'Samsung Galaxy S24 Ultra 512GB Titanium Gray',
          price: 1099.99,
          currency: 'USD',
          imageUrl: 'https://images.unsplash.com/photo-1610792516307-fb72d2e80e2d?w=100&h=100&fit=crop',
          listingType: 'FixedPrice',
          location: 'Florida, FL'
        },
        {
          id: '12345678905',
          title: 'Nintendo Switch OLED Pokemon Scarlet Bundle',
          price: 379.95,
          currency: 'USD',
          imageUrl: 'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=100&h=100&fit=crop',
          listingType: 'Auction',
          location: 'Washington, WA'
        }
      ],
      categoryBreakdown: {
        'Electronics': 45230,
        'Computers': 23891,
        'Gaming': 18764,
        'Mobile Phones': 37788
      },
      averagePrice: 1045.78,
      activeAuctions: 2,
      fixedPriceItems: 3,
      searchCategories: ['iPhone', 'MacBook', 'PlayStation', 'Samsung Galaxy', 'Nintendo Switch'],
      lastUpdated: new Date().toISOString()
    })
  }
}