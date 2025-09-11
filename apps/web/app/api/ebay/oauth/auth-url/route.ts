import { NextResponse } from 'next/server'
import crypto from 'crypto'

const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET
const REDIRECT_URI = 'https://yahuti-trade-engine.vercel.app/api/ebay/oauth/callback'
const EBAY_OAUTH_BASE_URL = 'https://auth.sandbox.ebay.com/oauth2/authorize'

// Comprehensive scopes for OAuth 2.0
const DEFAULT_SCOPES = [
  'https://api.ebay.com/oauth/api_scope',
  'https://api.ebay.com/oauth/api_scope/buy.order.readonly',
  'https://api.ebay.com/oauth/api_scope/buy.guest.order',
  'https://api.ebay.com/oauth/api_scope/sell.marketing.readonly',
  'https://api.ebay.com/oauth/api_scope/sell.marketing',
  'https://api.ebay.com/oauth/api_scope/sell.inventory.readonly',
  'https://api.ebay.com/oauth/api_scope/sell.inventory',
  'https://api.ebay.com/oauth/api_scope/sell.account.readonly',
  'https://api.ebay.com/oauth/api_scope/sell.account',
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly',
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
  'https://api.ebay.com/oauth/api_scope/sell.analytics.readonly',
  'https://api.ebay.com/oauth/api_scope/sell.marketplace.insights.readonly',
  'https://api.ebay.com/oauth/api_scope/commerce.catalog.readonly',
  'https://api.ebay.com/oauth/api_scope/buy.shopping.cart',
  'https://api.ebay.com/oauth/api_scope/buy.offer.auction',
  'https://api.ebay.com/oauth/api_scope/commerce.identity.readonly',
  'https://api.ebay.com/oauth/api_scope/commerce.identity.email.readonly',
  'https://api.ebay.com/oauth/api_scope/commerce.identity.phone.readonly',
  'https://api.ebay.com/oauth/api_scope/commerce.identity.address.readonly',
  'https://api.ebay.com/oauth/api_scope/commerce.identity.name.readonly',
  'https://api.ebay.com/oauth/api_scope/commerce.identity.status.readonly',
  'https://api.ebay.com/oauth/api_scope/sell.finances',
  'https://api.ebay.com/oauth/api_scope/sell.payment.dispute',
  'https://api.ebay.com/oauth/api_scope/sell.item.draft',
  'https://api.ebay.com/oauth/api_scope/sell.item',
  'https://api.ebay.com/oauth/api_scope/sell.reputation',
  'https://api.ebay.com/oauth/api_scope/sell.reputation.readonly',
  'https://api.ebay.com/oauth/api_scope/commerce.notification.subscription',
  'https://api.ebay.com/oauth/api_scope/commerce.notification.subscription.readonly',
  'https://api.ebay.com/oauth/api_scope/sell.stores',
  'https://api.ebay.com/oauth/api_scope/sell.stores.readonly',
  'https://api.ebay.com/oauth/api_scope/commerce.vero'
].join(' ')

export async function GET(request: Request) {
  try {
    if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET) {
      return NextResponse.json({
        success: false,
        error: 'eBay OAuth credentials not configured. Please check environment variables.'
      }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const requestedScopes = searchParams.get('scopes') || DEFAULT_SCOPES
    
    // Generate state parameter for OAuth 2.0 security
    const state = crypto.randomBytes(16).toString('hex')
    
    // Build OAuth 2.0 authorization URL
    const authUrl = `${EBAY_OAUTH_BASE_URL}?client_id=${EBAY_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(requestedScopes)}&state=${state}`
    
    // Debug logging
    console.log('eBay OAuth 2.0 Debug:', {
      clientId: EBAY_CLIENT_ID,
      redirectUri: REDIRECT_URI,
      scopes: requestedScopes,
      state: state,
      authUrl
    })
    
    return NextResponse.json({
      success: true,
      authUrl,
      state,
      clientId: EBAY_CLIENT_ID,
      redirectUri: REDIRECT_URI,
      scopes: requestedScopes,
      message: 'eBay OAuth 2.0 URL generated successfully',
      debug: {
        clientId: EBAY_CLIENT_ID,
        redirectUri: REDIRECT_URI,
        scopes: requestedScopes,
        state: state,
        authUrl
      }
    })
    
  } catch (error) {
    console.error('Error generating eBay auth URL:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate auth URL'
    }, { status: 500 })
  }
}