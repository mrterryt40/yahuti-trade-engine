import { NextResponse } from 'next/server'

export async function GET() {
  // Mock KPI data for now
  const mockData = {
    todayNet: 2847.50,
    mtdNet: 18293.25,
    bankroll: 45000.00,
    flipsToday: 23,
    successRate: 0.87,
    disputeRate: 0.03,
    totalVolume: 125000.00,
    activeListings: 156,
    lastUpdated: new Date().toISOString()
  }

  return NextResponse.json(mockData)
}