export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  
  if (error || !code) {
    return NextResponse.redirect(`${process.env.APP_URL}/?auth=error`)
  }

  const tokenUrl =
    (process.env.EBAY_ENV ?? 'sandbox') === 'production'
      ? 'https://api.ebay.com/identity/v1/oauth2/token'
      : 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'

  const basic = Buffer
    .from(`${process.env.EBAY_CLIENT_ID!}:${process.env.EBAY_CLIENT_SECRET!}`)
    .toString('base64')

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.EBAY_RUNAME!, // MUST match start route value exactly
  })

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      'Authorization': `Basic ${basic}`,
      'Cache-Control': 'no-store',
    },
    body: params,
  })

  if (!res.ok) {
    const body = await res.text() // capture ebay error (invalid_request, invalid_client, etc.)
    console.error('[ebay/callback] token_error:', res.status, body)
    // surface the reason in the URL so you can see it immediately
    return NextResponse.redirect(`${process.env.APP_URL}/?auth=failed&why=${encodeURIComponent(body.slice(0,200))}`)
  }

  const t = await res.json()
  const r = NextResponse.redirect(`${process.env.APP_URL}/?auth=ok`)
  r.cookies.set('ebay_access', t.access_token, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: t.expires_in })
  if (t.refresh_token) r.cookies.set('ebay_refresh', t.refresh_token, { httpOnly: true, secure: true, sameSite: 'lax', path: '/' })
  r.cookies.set('ebay_exp', String(Date.now() + t.expires_in * 1000), { httpOnly: true, secure: true, sameSite: 'lax', path: '/' })
  return r
}