import { NextResponse } from 'next/server'
import crypto from 'crypto'

const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET
const REDIRECT_URI = process.env.EBAY_REDIRECT_URI || 'http://localhost:3000/api/ebay/oauth/callback'
const EBAY_AUTH_BASE_URL = 'https://auth.sandbox.ebay.com/oauth2/authorize'

// Available scopes based on your eBay app configuration
const DEFAULT_SCOPES = [
  'https://api.ebay.com/oauth/api_scope',
  'https://api.ebay.com/oauth/api_scope/sell.inventory',
  'https://api.ebay.com/oauth/api_scope/sell.inventory.readonly',
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly',
  'https://api.ebay.com/oauth/api_scope/sell.marketing',
  'https://api.ebay.com/oauth/api_scope/sell.marketing.readonly',
  'https://api.ebay.com/oauth/api_scope/sell.account',
  'https://api.ebay.com/oauth/api_scope/sell.account.readonly',
  'https://api.ebay.com/oauth/api_scope/sell.analytics.readonly',
  'https://api.ebay.com/oauth/api_scope/commerce.identity.readonly',
].join(' ')

export async function GET(request: Request) {
  try {
    if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET) {
      return NextResponse.json({
        success: false,
        error: 'eBay OAuth credentials not configured'
      }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const requestedScopes = searchParams.get('scopes')
    
    // Generate state parameter for CSRF protection
    const state = crypto.randomBytes(32).toString('hex')
    
    // Build authorization URL
    const params = new URLSearchParams({
      client_id: EBAY_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: requestedScopes || DEFAULT_SCOPES,
      state: state,
    })
    
    const authUrl = `${EBAY_AUTH_BASE_URL}?${params.toString()}`
    
    return NextResponse.json({
      success: true,
      authUrl,
      state,
      scopes: requestedScopes || DEFAULT_SCOPES,
      message: 'Authorization URL generated successfully'
    })
    
  } catch (error) {
    console.error('Error generating eBay auth URL:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate auth URL'
    }, { status: 500 })
  }
}