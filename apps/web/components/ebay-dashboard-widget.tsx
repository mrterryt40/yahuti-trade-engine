"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useeBayDashboard } from '@/hooks/use-ebay'
import { formatCurrency, formatNumber, cn } from '@/lib/utils'
import {
  ShoppingBag,
  TrendingUp,
  Gavel,
  Tag,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  MapPin
} from 'lucide-react'
import Image from 'next/image'

interface eBayDashboardWidgetProps {
  className?: string
}

export function eBayDashboardWidget({ className }: eBayDashboardWidgetProps) {
  const { data, isLoading, error, refetch } = useeBayDashboard()

  if (isLoading) {
    return (
      <Card variant="yahuti" className={cn("min-h-[400px]", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            eBay Marketplace
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
            <ShoppingBag className="h-5 w-5" />
            eBay Marketplace
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center text-center">
          <div className="space-y-4">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
            <div>
              <p className="text-red-400 font-medium">Failed to load eBay data</p>
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
              <ShoppingBag className="h-5 w-5" />
              eBay Marketplace
            </CardTitle>
            <CardDescription>
              Live auction and fixed-price listings
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={refetch}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-black/20 rounded-lg border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-gray-400">Total Listings</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {formatNumber(data?.totalListings || 0)}
            </p>
          </div>

          <div className="p-4 bg-black/20 rounded-lg border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <span className="text-sm text-gray-400">Avg Price</span>
            </div>
            <p className="text-2xl font-bold text-white">
              ${data?.averagePrice?.toFixed(2) || '0.00'}
            </p>
          </div>

          <div className="p-4 bg-black/20 rounded-lg border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Gavel className="h-4 w-4 text-orange-400" />
              <span className="text-sm text-gray-400">Auctions</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {formatNumber(data?.activeAuctions || 0)}
            </p>
          </div>

          <div className="p-4 bg-black/20 rounded-lg border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingBag className="h-4 w-4 text-yahuti-gold-500" />
              <span className="text-sm text-gray-400">Fixed Price</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {formatNumber(data?.fixedPriceItems || 0)}
            </p>
          </div>
        </div>

        {/* Category Breakdown */}
        {data?.categoryBreakdown && Object.keys(data.categoryBreakdown).length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-3">Category Breakdown</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.categoryBreakdown).map(([category, count]) => (
                <Badge key={category} variant="outline" className="text-xs">
                  {category}: {formatNumber(count)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Search Categories */}
        {data?.searchCategories && data.searchCategories.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-3">Trending Searches</h4>
            <div className="flex flex-wrap gap-2">
              {data.searchCategories.map((keyword) => (
                <Badge key={keyword} variant="secondary" className="text-xs">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Featured Products */}
        {data?.featuredProducts && data.featuredProducts.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-3">Featured Listings</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.featuredProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 p-3 bg-black/20 rounded-lg border border-white/10 hover:border-yahuti-gold-500/30 transition-colors"
                >
                  {product.imageUrl && (
                    <div className="relative w-12 h-12 flex-shrink-0">
                      <Image
                        src={product.imageUrl}
                        alt={product.title}
                        fill
                        className="object-cover rounded"
                        sizes="48px"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {product.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge 
                        variant={product.listingType === 'Auction' ? "destructive" : "success"} 
                        className="text-xs"
                      >
                        {product.listingType === 'Auction' ? (
                          <>
                            <Gavel className="h-3 w-3 mr-1" />
                            Auction
                          </>
                        ) : (
                          <>
                            <Tag className="h-3 w-3 mr-1" />
                            Buy It Now
                          </>
                        )}
                      </Badge>
                      {product.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-400">{product.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-yahuti-gold-500">
                      ${product.price.toFixed(2)} {product.currency}
                    </p>
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
            View eBay
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}