export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

export async function GET() {
  const response = NextResponse.redirect(`${process.env.APP_URL || 'http://localhost:3000'}/?auth=ok`)
  
  // Set test cookies to simulate successful authentication
  const isSecure = process.env.NODE_ENV === 'production'
  const expiresIn = 7200 // 2 hours
  
  response.cookies.set('ebay_access', 'test_access_token_12345', {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: expiresIn
  })
  
  response.cookies.set('ebay_refresh', 'test_refresh_token_67890', {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/'
  })
  
  response.cookies.set('ebay_exp', String(Date.now() + expiresIn * 1000), {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/'
  })
  
  return response
}