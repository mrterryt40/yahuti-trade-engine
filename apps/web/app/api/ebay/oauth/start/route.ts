export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function GET() {
  try {
    const isProd = (process.env.EBAY_ENV ?? 'sandbox') === 'production'
    const authBase = isProd
      ? 'https://auth.ebay.com/oauth2/authorize'
      : 'https://auth.sandbox.ebay.com/oauth2/authorize'

    const clientId = process.env.EBAY_CLIENT_ID!
    const ruName = encodeURIComponent(process.env.EBAY_RUNAME!)
    const scopes = encodeURIComponent((process.env.EBAY_SCOPES ?? 'https://api.ebay.com/oauth/api_scope').trim())
    const state = encodeURIComponent(crypto.randomUUID())

    const url = `${authBase}?client_id=${clientId}&redirect_uri=${ruName}&response_type=code&scope=${scopes}&state=${state}`
    
    console.log('eBay OAuth start redirect:', { clientId, ruName: process.env.EBAY_RUNAME, url })
    
    return NextResponse.redirect(url, { status: 302 })
  } catch (error) {
    console.error('eBay OAuth start error:', error)
    return NextResponse.redirect(`${process.env.APP_URL || 'http://localhost:3000'}/?auth=error`, { status: 302 })
  }
}