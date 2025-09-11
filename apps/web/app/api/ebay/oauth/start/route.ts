export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function GET() {
  try {
    const authBase = (process.env.EBAY_ENV ?? 'sandbox') === 'production'
      ? 'https://auth.ebay.com/oauth2/authorize'
      : 'https://auth.sandbox.ebay.com/oauth2/authorize'

    const url =
      `${authBase}?client_id=${process.env.EBAY_CLIENT_ID!}` +
      `&redirect_uri=${encodeURIComponent(process.env.EBAY_RUNAME!)}` + // RuName string!
      `&response_type=code` +
      `&scope=${encodeURIComponent((process.env.EBAY_SCOPES ?? '').trim())}` +
      `&state=${encodeURIComponent(crypto.randomUUID())}`

    console.log('eBay OAuth start redirect:', { 
      clientId: process.env.EBAY_CLIENT_ID, 
      ruName: process.env.EBAY_RUNAME, 
      scopes: process.env.EBAY_SCOPES,
      url 
    })
    
    return NextResponse.redirect(url, { status: 302 })
  } catch (error) {
    console.error('eBay OAuth start error:', error)
    return NextResponse.redirect(`${process.env.APP_URL || 'http://localhost:3000'}/?auth=error`, { status: 302 })
  }
}