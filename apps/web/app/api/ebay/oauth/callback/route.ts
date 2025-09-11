export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

interface eBayTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  scope: string
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    
    console.log('eBay OAuth callback received:', { 
      code: code ? `${code.substring(0, 10)}...` : null,
      error
    })
    
    if (error || !code) {
      return NextResponse.redirect(`${process.env.APP_URL || 'http://localhost:3000'}/?auth=error`)
    }

    const tokenUrl = (process.env.EBAY_ENV ?? 'sandbox') === 'production'
      ? 'https://api.ebay.com/identity/v1/oauth2/token'
      : 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'

    const basic = Buffer.from(`${process.env.EBAY_CLIENT_ID!}:${process.env.EBAY_CLIENT_SECRET!}`).toString('base64')
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.EBAY_RUNAME! // MUST exactly match the authorize call
    })

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded', 
        Authorization: `Basic ${basic}` 
      },
      body
    })

    if (!res.ok) {
      console.error('Token exchange failed:', res.status, await res.text())
      return NextResponse.redirect(`${process.env.APP_URL || 'http://localhost:3000'}/?auth=failed`)
    }

    const tokens: eBayTokenResponse = await res.json()
    console.log('Token exchange successful')
    
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
    
  } catch (error) {
    console.error('eBay OAuth callback error:', error)
    return NextResponse.redirect(`${process.env.APP_URL || 'http://localhost:3000'}/?auth=error`)
  }
}