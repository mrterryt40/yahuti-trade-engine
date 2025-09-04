import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import { Target, TrendingUp, DollarSign, Clock, ExternalLink } from 'lucide-react'

export default function HuntBoardPage() {
  const opportunities = [
    {
      id: 1,
      product: 'PlayStation 5',
      source: 'Facebook Marketplace',
      target: 'eBay',
      buyPrice: 399,
      sellPrice: 549,
      profit: 150,
      margin: '37.6%',
      confidence: 'high',
      timeFound: '2 mins ago',
      status: 'active'
    },
    {
      id: 2,
      product: 'iPhone 15 Pro Max',
      source: 'Craigslist',
      target: 'Amazon',
      buyPrice: 899,
      sellPrice: 1199,
      profit: 300,
      margin: '33.4%',
      confidence: 'medium',
      timeFound: '5 mins ago',
      status: 'watching'
    },
    {
      id: 3,
      product: 'Nintendo Switch OLED',
      source: 'OfferUp',
      target: 'Mercari',
      buyPrice: 280,
      sellPrice: 349,
      profit: 69,
      margin: '24.6%',
      confidence: 'high',
      timeFound: '8 mins ago',
      status: 'active'
    }
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-yahuti-gold-500 mb-2">Hunt Board</h1>
          <p className="text-gray-400">Active opportunities and deal hunting dashboard</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="yahutiOutline" size="sm">
            <Target className="h-4 w-4 mr-2" />
            New Hunt
          </Button>
          <Button variant="yahuti" size="sm">
            <TrendingUp className="h-4 w-4 mr-2" />
            Analyze Market
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card variant="yahuti">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active Opportunities</p>
                <p className="text-2xl font-bold text-white">12</p>
              </div>
              <Target className="h-8 w-8 text-yahuti-gold-500" />
            </div>
          </CardContent>
        </Card>

        <Card variant="yahuti">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Potential Profit</p>
                <p className="text-2xl font-bold text-green-400">$2,847</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card variant="yahuti">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Avg Response Time</p>
                <p className="text-2xl font-bold text-blue-400">3.2m</p>
              </div>
              <Clock className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card variant="yahuti">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Current Opportunities
          </CardTitle>
          <CardDescription>
            Live deals detected by the Yahuti Hunt Engine
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {opportunities.map((opp) => (
              <div key={opp.id} className="flex items-center justify-between p-4 bg-black/20 rounded-lg border border-white/10">
                <div className="flex items-center gap-4">
                  <StatusBadge 
                    status={opp.status === 'active' ? 'active' : 'warning'} 
                    showDot 
                  />
                  <div>
                    <h3 className="font-semibold text-white">{opp.product}</h3>
                    <p className="text-sm text-gray-400">
                      {opp.source} → {opp.target}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Buy</p>
                    <p className="font-semibold text-white">${opp.buyPrice}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Sell</p>
                    <p className="font-semibold text-white">${opp.sellPrice}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Profit</p>
                    <p className="font-semibold text-green-400">${opp.profit}</p>
                    <p className="text-xs text-green-400">{opp.margin}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Found</p>
                    <p className="text-xs text-gray-300">{opp.timeFound}</p>
                  </div>
                  
                  <Button variant="yahuti" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}