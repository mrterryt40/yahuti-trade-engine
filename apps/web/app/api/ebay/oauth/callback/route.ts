import { NextResponse } from 'next/server'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET
const EBAY_RUNAME = process.env.EBAY_RUNAME!
const EBAY_TOKEN_URL = (process.env.EBAY_ENV ?? 'sandbox') === 'production'
  ? 'https://api.ebay.com/identity/v1/oauth2/token'
  : 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'

interface eBayTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  scope: string
}

export async function GET(request: Request) {
  try {
    if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET || !EBAY_RUNAME) {
      return NextResponse.redirect(
        `${process.env.APP_URL || 'http://localhost:3000'}/?auth=error`
      )
    }

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const state = searchParams.get('state')
    
    console.log('eBay OAuth callback received:', { 
      code: code ? `${code.substring(0, 10)}...` : null,
      error, 
      state
    })
    
    if (error) {
      return NextResponse.redirect(
        `${process.env.APP_URL || 'http://localhost:3000'}/?auth=error`
      )
    }
    
    if (!code) {
      return NextResponse.redirect(
        `${process.env.APP_URL || 'http://localhost:3000'}/?auth=failed`
      )
    }
    
    const basic = Buffer.from(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`).toString('base64')
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: EBAY_RUNAME
    })

    try {
      const tokenResponse = await fetch(EBAY_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${basic}`
        },
        body
      })
      
      if (!tokenResponse.ok) {
        return NextResponse.redirect(`${process.env.APP_URL || 'http://localhost:3000'}/?auth=failed`)
      }
      
      const tokens: eBayTokenResponse = await tokenResponse.json()
      const response = NextResponse.redirect(`${process.env.APP_URL || 'http://localhost:3000'}/?auth=ok`)
      
      response.cookies.set('ebay_access', tokens.access_token, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production', 
        path: '/',
        maxAge: tokens.expires_in
      })
      
      if (tokens.refresh_token) {
        response.cookies.set('ebay_refresh', tokens.refresh_token, { 
          httpOnly: true, 
          secure: process.env.NODE_ENV === 'production', 
          path: '/',
          maxAge: 86400 * 365
        })
      }
      
      response.cookies.set('ebay_exp', String(Date.now() + tokens.expires_in * 1000), { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production', 
        path: '/',
        maxAge: tokens.expires_in
      })
      
      return response
      
    } catch (tokenError) {
      console.error('Token exchange error:', tokenError)
      return NextResponse.redirect(`${process.env.APP_URL || 'http://localhost:3000'}/?auth=failed`)
    }
    
  } catch (error) {
    console.error('eBay OAuth callback error:', error)
    return NextResponse.redirect(`${process.env.APP_URL || 'http://localhost:3000'}/?auth=error`)
  }
}