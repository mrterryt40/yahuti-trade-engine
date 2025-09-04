import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DollarSign, TrendingUp, ArrowUpCircle, ArrowDownCircle, BarChart3 } from 'lucide-react'

export default function CashflowPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-yahuti-gold-500 mb-2">Cashflow</h1>
          <p className="text-gray-400">Financial tracking and cash flow analysis</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="yahutiOutline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
          <Button variant="yahuti" size="sm">
            <TrendingUp className="h-4 w-4 mr-2" />
            Analyze Trends
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card variant="yahuti">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Inflow</p>
                <p className="text-2xl font-bold text-green-400">$18,923</p>
              </div>
              <ArrowDownCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card variant="yahuti">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Outflow</p>
                <p className="text-2xl font-bold text-red-400">$12,456</p>
              </div>
              <ArrowUpCircle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card variant="yahuti">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Net Flow</p>
                <p className="text-2xl font-bold text-yahuti-gold-500">$6,467</p>
              </div>
              <DollarSign className="h-8 w-8 text-yahuti-gold-500" />
            </div>
          </CardContent>
        </Card>

        <Card variant="yahuti">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Growth Rate</p>
                <p className="text-2xl font-bold text-blue-400">+12.3%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card variant="yahuti">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Cashflow Analysis
          </CardTitle>
          <CardDescription>Detailed financial flow tracking and projections</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12">
          <p className="text-gray-400 mb-4">Advanced cashflow analytics coming soon</p>
          <Button variant="yahuti">
            <DollarSign className="h-4 w-4 mr-2" />
            Set Up Tracking
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}