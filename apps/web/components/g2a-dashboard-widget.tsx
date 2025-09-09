"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useG2ADashboard } from '@/hooks/use-g2a'
import { formatCurrency, formatNumber, cn } from '@/lib/utils'
import {
  ShoppingCart,
  TrendingUp,
  Package,
  Gamepad2,
  RefreshCw,
  AlertCircle,
  ExternalLink
} from 'lucide-react'
import Image from 'next/image'

interface G2ADashboardWidgetProps {
  className?: string
}

export function G2ADashboardWidget({ className }: G2ADashboardWidgetProps) {
  const { data, isLoading, error, refetch } = useG2ADashboard()

  if (isLoading) {
    return (
      <Card variant="yahuti" className={cn("min-h-[400px]", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5" />
            G2A Marketplace
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center">
          <LoadingSpinner />
        </CardContent>
      </Card>
    )
  }

  if (error && !data) {
    return (
      <Card variant="yahuti" className={cn("min-h-[400px]", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5" />
            G2A Marketplace
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center text-center">
          <div className="space-y-4">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
            <div>
              <p className="text-red-400 font-medium">Failed to load G2A data</p>
              <p className="text-sm text-gray-400 mt-1">{error}</p>
              <Button variant="yahutiOutline" size="sm" onClick={refetch} className="mt-3">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="yahuti" className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5" />
              G2A Marketplace
            </CardTitle>
            <CardDescription>
              Digital product marketplace integration
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={refetch}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-4 bg-black/20 rounded-lg border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-gray-400">Total Products</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {formatNumber(data?.totalProducts || 0)}
            </p>
          </div>

          <div className="p-4 bg-black/20 rounded-lg border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <span className="text-sm text-gray-400">Avg Price</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(data?.averagePrice || 0)}
            </p>
          </div>

          <div className="p-4 bg-black/20 rounded-lg border border-white/10 md:col-span-1 col-span-2">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart className="h-4 w-4 text-yahuti-gold-500" />
              <span className="text-sm text-gray-400">Available</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {data?.topProducts?.filter(p => p.availableToBuy).length || 0}
            </p>
          </div>
        </div>

        {/* Platform Breakdown */}
        {data?.platformBreakdown && Object.keys(data.platformBreakdown).length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-3">Platform Breakdown</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.platformBreakdown).map(([platform, count]) => (
                <Badge key={platform} variant="outline" className="text-xs">
                  {platform}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Top Products */}
        {data?.topProducts && data.topProducts.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-3">Featured Products</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.topProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 p-3 bg-black/20 rounded-lg border border-white/10 hover:border-yahuti-gold-500/30 transition-colors"
                >
                  {product.thumbnail && (
                    <div className="relative w-12 h-12 flex-shrink-0">
                      <Image
                        src={product.thumbnail}
                        alt={product.name}
                        fill
                        className="object-cover rounded"
                        sizes="48px"
                        onError={(e) => {
                          // Hide image on error
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {product.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge 
                        variant={product.availableToBuy ? "success" : "destructive"} 
                        className="text-xs"
                      >
                        {product.platform || 'Unknown'}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        Qty: {product.qty}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-yahuti-gold-500">
                      {formatCurrency(product.price)}
                    </p>
                    {product.availableToBuy && (
                      <Badge variant="success" className="text-xs mt-1">
                        Available
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Status */}
        {data?.error && (
          <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <span className="text-sm text-red-400">{data.error}</span>
            </div>
          </div>
        )}

        {/* Last Updated */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-white/10">
          <span>
            Last updated: {data?.lastUpdated ? new Date(data.lastUpdated).toLocaleString() : 'Never'}
          </span>
          <Button variant="ghost" size="sm" className="text-xs h-auto py-1 px-2">
            <ExternalLink className="h-3 w-3 mr-1" />
            View All
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}