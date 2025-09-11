export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = cookies()
  const accessToken = cookieStore.get('ebay_access')?.value
  const refreshToken = cookieStore.get('ebay_refresh')?.value  
  const tokenExp = cookieStore.get('ebay_exp')?.value

  return NextResponse.json({
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
    hasTokenExp: !!tokenExp,
    accessTokenLength: accessToken?.length || 0,
    tokenExpValue: tokenExp,
    isExpired: tokenExp ? Date.now() > parseInt(tokenExp) : null,
    allCookies: Object.fromEntries(
      cookieStore.getAll().map(cookie => [cookie.name, cookie.value.substring(0, 20) + '...'])
    )
  })
}