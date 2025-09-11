import { NextResponse } from 'next/server'
import crypto from 'crypto'

const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET
const REDIRECT_URI = 'https://yahuti-trade-engine.vercel.app/api/ebay/oauth/callback'
const EBAY_RUNAME = 'Terry_Taylor-TerryTay-Yahuti-micwny'
const EBAY_OAUTH_BASE_URL = 'https://auth.sandbox.ebay.com/oauth2/authorize'

// Basic scope for testing OAuth 2.0
const DEFAULT_SCOPES = 'https://api.ebay.com/oauth/api_scope'

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
    
    // Generate state parameter for CSRF protection
    const state = crypto.randomBytes(32).toString('hex')
    
    // Build OAuth 2.0 authorization URL
    const params = new URLSearchParams({
      client_id: EBAY_CLIENT_ID!,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      scope: requestedScopes,
      state: state
    })
    
    const authUrl = `${EBAY_OAUTH_BASE_URL}?${params.toString()}`
    
    // Debug logging
    console.log('eBay OAuth 2.0 Debug:', {
      clientId: EBAY_CLIENT_ID,
      redirectUri: REDIRECT_URI,
      state: state,
      authUrl
    })
    
    return NextResponse.json({
      success: true,
      authUrl,
      state,
      clientId: EBAY_CLIENT_ID,
      redirectUri: REDIRECT_URI,
      message: 'eBay OAuth 2.0 URL generated successfully',
      debug: {
        clientId: EBAY_CLIENT_ID,
        redirectUri: REDIRECT_URI,
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