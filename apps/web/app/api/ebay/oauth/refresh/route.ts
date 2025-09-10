import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET
const EBAY_TOKEN_URL = 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'

interface eBayTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope: string
}

export async function POST() {
  try {
    if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET) {
      return NextResponse.json({
        success: false,
        error: 'eBay OAuth credentials not configured'
      }, { status: 500 })
    }

    const cookieStore = cookies()
    const refreshToken = cookieStore.get('ebay_refresh_token')?.value
    
    if (!refreshToken) {
      return NextResponse.json({
        success: false,
        error: 'No refresh token available'
      }, { status: 401 })
    }
    
    // Exchange refresh token for new access token
    const tokenParams = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      scope: 'https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.fulfillment'
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
      console.error('eBay token refresh failed:', errorText)
      throw new Error(`Token refresh failed: ${tokenResponse.status}`)
    }
    
    const tokenData: eBayTokenResponse = await tokenResponse.json()
    
    // Create response and set new tokens
    const response = NextResponse.json({
      success: true,
      message: 'Token refreshed successfully',
      expires_in: tokenData.expires_in
    })
    
    // Update cookies with new tokens
    response.cookies.set('ebay_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenData.expires_in
    })
    
    if (tokenData.refresh_token) {
      response.cookies.set('ebay_refresh_token', tokenData.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 86400 * 365 // 1 year
      })
    }
    
    response.cookies.set('ebay_token_expires', (Date.now() + tokenData.expires_in * 1000).toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenData.expires_in
    })
    
    return response
    
  } catch (error) {
    console.error('eBay token refresh error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to refresh token'
    }, { status: 500 })
  }
}