import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'eBay OAuth callback endpoint is reachable',
    timestamp: new Date().toISOString()
  })
}

export async function POST() {
  return NextResponse.json({
    success: true,
    message: 'eBay OAuth callback endpoint POST is reachable',
    timestamp: new Date().toISOString()
  })
}