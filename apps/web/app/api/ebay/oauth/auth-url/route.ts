import { NextResponse } from 'next/server'
import crypto from 'crypto'

const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET
const REDIRECT_URI = process.env.EBAY_REDIRECT_URI || 'http://localhost:3000/api/ebay/oauth/callback'
const EBAY_RUNAME = 'Terry_Taylor-TerryTay-Yahuti-micwny'
const EBAY_AUTH_BASE_URL = 'https://signin.sandbox.ebay.com/ws/eBayISAPI.dll'

// Minimal scope for basic authentication
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
    const requestedScopes = searchParams.get('scopes')
    
    // Generate state parameter for CSRF protection
    const state = crypto.randomBytes(32).toString('hex')
    
    // Generate session ID for eBay's Auth'n'Auth flow
    const sessionId = crypto.randomBytes(16).toString('hex')
    
    // Build eBay Auth'n'Auth URL using RuName
    const params = new URLSearchParams({
      SignIn: '',
      runame: EBAY_RUNAME,
      SessID: sessionId
    })
    
    // Fix the SignIn parameter to match eBay's expected format
    const authUrl = `${EBAY_AUTH_BASE_URL}?SignIn&runame=${EBAY_RUNAME}&SessID=${sessionId}`
    
    // Debug logging
    console.log('eBay Auth\'n\'Auth Debug:', {
      runame: EBAY_RUNAME,
      sessionId: sessionId,
      authUrl
    })
    
    return NextResponse.json({
      success: true,
      authUrl,
      sessionId,
      runame: EBAY_RUNAME,
      message: 'eBay Auth\'n\'Auth URL generated successfully',
      debug: {
        runame: EBAY_RUNAME,
        sessionId: sessionId,
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