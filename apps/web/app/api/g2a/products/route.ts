import { NextResponse } from 'next/server'

const G2A_BASE_URL = 'https://sandboxapi.g2a.com/v1'
const CLIENT_ID = 'qdaiciDiyMaTjxMt'
const API_KEY = '74026b3dc2c6db6a30a73e71cdb138b1e1b5eb7a97ced46689e2d28db1050875'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const minQty = searchParams.get('minQty') || '1'
    
    const queryParams = new URLSearchParams()
    queryParams.append('page', page)
    queryParams.append('minQty', minQty)
    
    const response = await fetch(`${G2A_BASE_URL}/products?${queryParams.toString()}`, {
      headers: {
        'Authorization': `${CLIENT_ID}, ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('G2A products API route error:', error)
    return NextResponse.json({
      error: 'Failed to fetch G2A products',
      total: 0,
      page: 1,
      docs: []
    }, { status: 500 })
  }
}