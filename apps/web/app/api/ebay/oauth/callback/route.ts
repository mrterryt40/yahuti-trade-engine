import { NextResponse } from 'next/server'

const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET
const REDIRECT_URI = process.env.EBAY_REDIRECT_URI || 'http://localhost:3000/api/ebay/oauth/callback'
const EBAY_TOKEN_URL = 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'

interface eBayTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  scope: string
}

export async function GET(request: Request) {
  try {
    if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET) {
      return NextResponse.redirect(
        `${process.env.APP_URL || 'http://localhost:3000'}/dashboard?error=${encodeURIComponent('eBay OAuth credentials not configured')}`
      )
    }

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    
    if (error) {
      return NextResponse.redirect(
        `${process.env.APP_URL || 'http://localhost:3000'}/dashboard?error=${encodeURIComponent(error)}`
      )
    }
    
    if (!code) {
      return NextResponse.json({
        success: false,
        error: 'Authorization code not provided'
      }, { status: 400 })
    }
    
    // Exchange authorization code for access token
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI,
    })
    
    const credentials = Buffer.from(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`).toString('base64')
    
    const tokenResponse = await fetch(EBAY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: tokenParams.toString()
    })
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('eBay token exchange failed:', errorText)
      throw new Error(`Token exchange failed: ${tokenResponse.status}`)
    }
    
    const tokenData: eBayTokenResponse = await tokenResponse.json()
    
    // In a real application, you would store these tokens securely
    // For now, we'll store them in a cookie/session for demo purposes
    const response = NextResponse.redirect(
      `${process.env.APP_URL || 'http://localhost:3000'}/dashboard?auth=success`
    )
    
    // Set secure cookies with the tokens
    response.cookies.set('ebay_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenData.expires_in
    })
    
    response.cookies.set('ebay_refresh_token', tokenData.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400 * 365 // 1 year
    })
    
    response.cookies.set('ebay_token_expires', (Date.now() + tokenData.expires_in * 1000).toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenData.expires_in
    })
    
    return response
    
  } catch (error) {
    console.error('eBay OAuth callback error:', error)
    
    return NextResponse.redirect(
      `${process.env.APP_URL || 'http://localhost:3000'}/dashboard?error=${encodeURIComponent(
        error instanceof Error ? error.message : 'OAuth callback failed'
      )}`
    )
  }
}