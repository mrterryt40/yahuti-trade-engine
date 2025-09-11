import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('Local eBay authentication simulation triggered')
    
    // Create simulated token data
    const tokenData = {
      access_token: `local_simulated_token_${Date.now()}`,
      refresh_token: `local_simulated_refresh_${Date.now()}`,
      expires_in: 7200, // 2 hours
      token_type: 'Bearer',
      scope: 'https://api.ebay.com/oauth/api_scope'
    }
    
    // Redirect to callback with simulated success
    const callbackUrl = `http://localhost:3000/api/ebay/oauth/callback?isAuthSuccessful=true`
    
    return NextResponse.redirect(callbackUrl)
    
  } catch (error) {
    console.error('Local eBay auth simulation error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Local auth simulation failed'
    }, { status: 500 })
  }
}