import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const EBAY_IDENTITY_URL = 'https://api.sandbox.ebay.com/commerce/identity/v1/user'

export async function GET() {
  try {
    const cookieStore = cookies()
    const accessToken = cookieStore.get('ebay_access_token')?.value
    const tokenExpires = cookieStore.get('ebay_token_expires')?.value
    
    if (!accessToken) {
      return NextResponse.json({
        success: false,
        authenticated: false,
        message: 'No access token found'
      })
    }
    
    // Check if token is expired
    const expiresAt = tokenExpires ? parseInt(tokenExpires) : 0
    const isExpired = Date.now() > expiresAt
    
    if (isExpired) {
      return NextResponse.json({
        success: false,
        authenticated: false,
        expired: true,
        message: 'Access token has expired'
      })
    }
    
    // Try to get user information to verify token validity
    try {
      const userResponse = await fetch(EBAY_IDENTITY_URL, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
        }
      })
      
      if (userResponse.ok) {
        const userData = await userResponse.json()
        
        return NextResponse.json({
          success: true,
          authenticated: true,
          user: {
            userId: userData.userId,
            username: userData.username,
            firstName: userData.individualAccount?.firstName,
            lastName: userData.individualAccount?.lastName,
            email: userData.individualAccount?.email
          },
          tokenInfo: {
            expiresAt: new Date(expiresAt).toISOString(),
            expiresIn: Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
          }
        })
      } else {
        // Token might be invalid
        return NextResponse.json({
          success: false,
          authenticated: false,
          invalid: true,
          message: 'Access token is invalid'
        })
      }
    } catch (identityError) {
      // If identity call fails, still return basic auth status
      return NextResponse.json({
        success: true,
        authenticated: true,
        tokenInfo: {
          expiresAt: new Date(expiresAt).toISOString(),
          expiresIn: Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
        },
        message: 'Token exists but user info unavailable'
      })
    }
    
  } catch (error) {
    console.error('eBay OAuth status check error:', error)
    
    return NextResponse.json({
      success: false,
      authenticated: false,
      error: error instanceof Error ? error.message : 'Failed to check auth status'
    }, { status: 500 })
  }
}