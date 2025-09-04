import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp, BarChart3, PieChart, LineChart, Target } from 'lucide-react'

export default function MarketEdgePage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-yahuti-gold-500 mb-2">Market Edge</h1>
          <p className="text-gray-400">Advanced market analysis and competitive intelligence</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="yahutiOutline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
          <Button variant="yahuti" size="sm">
            <Target className="h-4 w-4 mr-2" />
            Find Edge
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card variant="yahuti">
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-12 w-12 text-yahuti-gold-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Market Trends</h3>
            <p className="text-gray-400">Real-time market movement analysis</p>
          </CardContent>
        </Card>

        <Card variant="yahuti">
          <CardContent className="p-6 text-center">
            <PieChart className="h-12 w-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Sector Analysis</h3>
            <p className="text-gray-400">Category performance insights</p>
          </CardContent>
        </Card>

        <Card variant="yahuti">
          <CardContent className="p-6 text-center">
            <LineChart className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Price Predictions</h3>
            <p className="text-gray-400">AI-powered market forecasting</p>
          </CardContent>
        </Card>
      </div>

      <Card variant="yahuti">
        <CardHeader>
          <CardTitle>Market Edge Dashboard</CardTitle>
          <CardDescription>Coming soon - Advanced market analysis tools</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12">
          <p className="text-gray-400 mb-4">This feature is under development</p>
          <Button variant="yahuti">
            <Target className="h-4 w-4 mr-2" />
            Request Early Access
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}