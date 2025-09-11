export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

const SCOPES = [
  'https://api.ebay.com/oauth/api_scope',
  'https://api.ebay.com/oauth/api_scope/buy.order.readonly',
  'https://api.ebay.com/oauth/api_scope/buy.guest.order',
  'https://api.ebay.com/oauth/api_scope/sell.marketing.readonly',
  'https://api.ebay.com/oauth/api_scope/sell.marketing',
  'https://api.ebay.com/oauth/api_scope/sell.inventory.readonly',
  'https://api.ebay.com/oauth/api_scope/sell.inventory',
  'https://api.ebay.com/oauth/api_scope/sell.account.readonly',
  'https://api.ebay.com/oauth/api_scope/sell.account',
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly',
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
  'https://api.ebay.com/oauth/api_scope/sell.analytics.readonly',
  'https://api.ebay.com/oauth/api_scope/sell.marketplace.insights.readonly',
  'https://api.ebay.com/oauth/api_scope/commerce.catalog.readonly',
  'https://api.ebay.com/oauth/api_scope/buy.shopping.cart',
  'https://api.ebay.com/oauth/api_scope/buy.offer.auction',
  'https://api.ebay.com/oauth/api_scope/commerce.identity.readonly',
  'https://api.ebay.com/oauth/api_scope/commerce.identity.email.readonly',
  'https://api.ebay.com/oauth/api_scope/commerce.identity.phone.readonly',
  'https://api.ebay.com/oauth/api_scope/commerce.identity.address.readonly',
  'https://api.ebay.com/oauth/api_scope/commerce.identity.name.readonly',
  'https://api.ebay.com/oauth/api_scope/commerce.identity.status.readonly',
  'https://api.ebay.com/oauth/api_scope/sell.finances',
  'https://api.ebay.com/oauth/api_scope/sell.payment.dispute',
  'https://api.ebay.com/oauth/api_scope/sell.item.draft',
  'https://api.ebay.com/oauth/api_scope/sell.item',
  'https://api.ebay.com/oauth/api_scope/sell.reputation',
  'https://api.ebay.com/oauth/api_scope/sell.reputation.readonly',
  'https://api.ebay.com/oauth/api_scope/commerce.notification.subscription',
  'https://api.ebay.com/oauth/api_scope/commerce.notification.subscription.readonly',
  'https://api.ebay.com/oauth/api_scope/sell.stores',
  'https://api.ebay.com/oauth/api_scope/sell.stores.readonly',
  'https://api.ebay.com/oauth/api_scope/commerce.vero',
]

export async function GET() {
  try {
    const authBase =
      (process.env.EBAY_ENV ?? 'sandbox') === 'production'
        ? 'https://auth.ebay.com/oauth2/authorize'
        : 'https://auth.sandbox.ebay.com/oauth2/authorize'

    const url = new URL(authBase)
    url.searchParams.set('client_id', process.env.EBAY_CLIENT_ID!)
    url.searchParams.set('redirect_uri', process.env.EBAY_RUNAME!) // exact RuName string
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', SCOPES.join(' ')) // joined, then URL API encodes it
    url.searchParams.set('state', crypto.randomUUID())

    console.log('eBay OAuth start redirect:', { 
      clientId: process.env.EBAY_CLIENT_ID,
      ruName: process.env.EBAY_RUNAME,
      finalUrl: url.toString()
    })
    
    return NextResponse.redirect(url.toString(), { status: 302 })
  } catch (error) {
    console.error('eBay OAuth start error:', error)
    return NextResponse.redirect(`${process.env.APP_URL || 'http://localhost:3000'}/?auth=error`, { status: 302 })
  }
}