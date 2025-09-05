"use client"

import { useState, useEffect, lazy, Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn, formatCurrency, formatNumber, formatPercentage } from '@/lib/utils'
import { useKPISummary, mockKPIData } from '@/hooks/use-kpis'
import {
  TrendingUp,
  TrendingDown,
  Activity,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  Zap,
  Play,
  Pause,
  Square,
  BarChart3,
  Target,
} from 'lucide-react'
import type { SystemHealth, Alert } from '@/types'

// Lazy load heavy components
const StatusBadge = lazy(() => import('@/components/ui/badge').then(m => ({ default: m.StatusBadge })))

interface CommandDeckProps {
  className?: string
}

export function CommandDeck({ className }: CommandDeckProps) {
  const { data: kpiData, metrics, isLoading, error, refetch } = useKPISummary()
  const [mounted, setMounted] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [engineStatus, setEngineStatus] = useState<'stopped' | 'running' | 'paused'>('running')

  useEffect(() => {
    setMounted(true)
  }, [])

  // Update clock every second - force redeploy 
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Update system status when engine status changes
  useEffect(() => {
    setSystemStatus(prev => ({
      ...prev,
      status: engineStatus === 'stopped' ? 'offline' : 'online'
    }))
  }, [engineStatus])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refetch()
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Failed to refresh data:', error)
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000) // Show spinner for at least 1 second
    }
  }

  const handleConfigure = () => {
    // Navigate to settings page or show configuration modal
    window.location.href = '/settings'
  }

  const handleStartEngine = () => {
    setEngineStatus('running')
    console.log('Engine started')
    // Here you would typically make an API call to start the trading engine
    // Example: await api.post('/engine/start')
  }

  const handlePauseTrading = () => {
    setEngineStatus('paused')
    console.log('Trading paused')
    // Here you would typically make an API call to pause trading
    // Example: await api.post('/engine/pause')
  }

  const handleEmergencyStop = () => {
    setEngineStatus('stopped')
    console.log('Emergency stop activated')
    // Here you would typically make an API call to emergency stop
    // Example: await api.post('/engine/emergency-stop')
  }
  const [systemStatus, setSystemStatus] = useState<SystemHealth>({
    status: 'online',
    uptime: 1842, // minutes
    lastUpdate: new Date().toISOString(),
    modules: {
      'Hunt Engine': { status: 'active', lastCheck: new Date().toISOString() },
      'Price Monitor': { status: 'active', lastCheck: new Date().toISOString() },
      'Auto Trader': { status: 'active', lastCheck: new Date().toISOString() },
      'Risk Manager': { status: 'warning', message: 'High exposure detected', lastCheck: new Date().toISOString() },
      'Notification System': { status: 'active', lastCheck: new Date().toISOString() },
      'Data Sync': { status: 'inactive', message: 'Manual sync required', lastCheck: new Date().toISOString() },
    }
  })

  const [recentAlerts] = useState<Alert[]>([
    {
      id: '1',
      title: 'High Profit Opportunity',
      message: 'New listing detected with 45% profit margin on PlayStation 5',
      severity: 'info',
      category: 'market',
      read: false,
      acknowledged: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '2',
      title: 'Risk Threshold Exceeded',
      message: 'Total exposure has exceeded 80% of maximum limit',
      severity: 'warning',
      category: 'risk',
      read: false,
      acknowledged: false,
      createdAt: new Date(Date.now() - 300000).toISOString(),
      updatedAt: new Date(Date.now() - 300000).toISOString(),
    },
    {
      id: '3',
      title: 'Trade Completed',
      message: 'iPhone 15 Pro flip completed successfully for $127 profit',
      severity: 'info',
      category: 'trade',
      read: true,
      acknowledged: true,
      createdAt: new Date(Date.now() - 600000).toISOString(),
      updatedAt: new Date(Date.now() - 600000).toISOString(),
    },
  ])

  // Update last refresh time
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date())
    }, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [])

  // Use mock data if API data is not available
  const displayData = kpiData || mockKPIData
  const displayMetrics = (metrics as any) || [
    { label: "Today's Net", value: mockKPIData.todayNet, format: 'currency' as const },
    { label: "MTD Net", value: mockKPIData.mtdNet, format: 'currency' as const },
    { label: "Bankroll", value: mockKPIData.bankroll, format: 'currency' as const },
    { label: "Flips Today", value: mockKPIData.flipsToday, format: 'number' as const },
  ]

  function getAlertIcon(severity: string) {
    switch (severity) {
      case 'critical':
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'info':
        return <CheckCircle className="h-4 w-4 text-blue-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  function formatValue(value: number | string, format?: 'currency' | 'percentage' | 'number') {
    if (typeof value === 'string') return value

    switch (format) {
      case 'currency':
        return formatCurrency(value)
      case 'percentage':
        return formatPercentage(value)
      case 'number':
        return formatNumber(value)
      default:
        return value.toString()
    }
  }

  function getChangeIcon(changeType?: 'increase' | 'decrease' | 'neutral'): React.ReactNode {
    switch (changeType) {
      case 'increase':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'decrease':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  return (
    <div className={cn("flex flex-col space-y-6 p-6 bg-black min-h-screen", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-yahuti-gold-500 mb-1">
            Command Deck
          </h1>
          <p className="text-gray-400">
            Last updated: {mounted ? lastUpdate.toLocaleTimeString() : '--:--:--'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="yahutiOutline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", (isLoading || isRefreshing) && "animate-spin")} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          
          <Button 
            variant="yahuti" 
            size="sm"
            onClick={handleConfigure}
          >
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </div>
      </div>

      {/* System Status & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Status */}
        <Card variant="yahuti" className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Status
            </CardTitle>
            <CardDescription>
              Uptime: {Math.floor(systemStatus.uptime / 60)}h {systemStatus.uptime % 60}m
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(systemStatus.modules).map(([name, module]) => (
                <div key={name} className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/10">
                  <div>
                    <p className="text-sm font-medium text-white">{name}</p>
                    {module.message && (
                      <p className="text-xs text-gray-400 mt-1">{module.message}</p>
                    )}
                  </div>
                  <StatusBadge status={module.status} showDot />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Global Controls */}
        <Card variant="yahuti">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Engine Control
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="success" 
              size="lg" 
              className="w-full"
              onClick={handleStartEngine}
              disabled={engineStatus === 'running'}
            >
              <Play className="h-4 w-4 mr-2" />
              {engineStatus === 'running' ? 'Engine Running' : 'Start Engine'}
            </Button>
            <Button 
              variant="warning" 
              size="lg" 
              className="w-full"
              onClick={handlePauseTrading}
              disabled={engineStatus === 'stopped'}
            >
              <Pause className="h-4 w-4 mr-2" />
              {engineStatus === 'paused' ? 'Trading Paused' : 'Pause Trading'}
            </Button>
            <Button 
              variant="destructive" 
              size="lg" 
              className="w-full"
              onClick={handleEmergencyStop}
            >
              <Square className="h-4 w-4 mr-2" />
              Emergency Stop
            </Button>
            
          </CardContent>
        </Card>
      </div>

      {/* KPI Widgets Grid */}
      {/* @ts-ignore */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {(displayMetrics as any[]).map((metric: any, index: number) => (
          <Card key={metric.label} variant="glass" className="hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-400">{metric.label}</p>
                {getChangeIcon(metric.changeType)}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-white">
                  {formatValue(metric.value, metric.format)}
                </p>
                {metric.change && (
                  <p className={cn(
                    "text-sm font-medium",
                    metric.changeType === 'increase' ? "text-green-500" : "text-red-500"
                  )}>
                    {formatPercentage(metric.change)}
                  </p>
                )}
              </div>
              {metric.trend && (
                <div className="mt-3 h-8">
                  <div className="flex items-end space-x-1 h-full">
                    {metric.trend.slice(-7).map((value, i) => (
                      <div
                        key={i}
                        className="bg-yahuti-gold-500/60 rounded-sm flex-1 transition-all duration-300"
                        style={{
                          height: `${(value / Math.max(...metric.trend)) * 100}%`,
                          minHeight: '2px',
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity Feed & Additional Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Alerts/Activity */}
        <Card variant="yahuti" className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest alerts and system events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                    alert.read
                      ? "bg-gray-900/30 border-gray-700"
                      : "bg-yahuti-maroon-900/20 border-yahuti-gold-500/30"
                  )}
                >
                  {getAlertIcon(alert.severity)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{alert.title}</p>
                    <p className="text-xs text-gray-400 mt-1">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {mounted ? new Date(alert.createdAt).toLocaleTimeString() : '--:--:--'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Summary */}
        <Card variant="yahuti">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Success Rate</span>
                <span className="text-sm font-semibold text-green-400">
                  {formatPercentage(displayData.successRate)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Dispute Rate</span>
                <span className="text-sm font-semibold text-yellow-400">
                  {formatPercentage(displayData.disputeRate)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Active Listings</span>
                <span className="text-sm font-semibold text-blue-400">
                  {formatNumber(displayData.activeListings)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Total Volume</span>
                <span className="text-sm font-semibold text-yahuti-gold-500">
                  {formatCurrency(displayData.totalVolume)}
                </span>
              </div>
            </div>

          </CardContent>
        </Card>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-yahuti-gold-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-white">Loading...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card variant="yahuti" className="border-red-500/30 bg-red-900/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              <span>Failed to load dashboard data. Please try refreshing.</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}