import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import { Shield, AlertTriangle, TrendingDown, Settings, RefreshCw } from 'lucide-react'

export default function RiskPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-yahuti-gold-500 mb-2">Risk & Compliance</h1>
          <p className="text-gray-400">Risk monitoring, compliance tracking, and safety controls</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="yahutiOutline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Risk Settings
          </Button>
          <Button variant="yahuti" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card variant="yahuti">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Risk Level</p>
                <p className="text-2xl font-bold text-green-400">Low</p>
              </div>
              <Shield className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card variant="yahuti">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Portfolio Exposure</p>
                <p className="text-2xl font-bold text-yellow-400">67%</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card variant="yahuti">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Max Drawdown</p>
                <p className="text-2xl font-bold text-red-400">-8.2%</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card variant="yahuti">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Risk Management Dashboard
          </CardTitle>
          <CardDescription>Advanced risk analytics and compliance monitoring</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12">
          <p className="text-gray-400 mb-4">Risk management features under development</p>
          <StatusBadge status="warning" showDot />
        </CardContent>
      </Card>
    </div>
  )
}