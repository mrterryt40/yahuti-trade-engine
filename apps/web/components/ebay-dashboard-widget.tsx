"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useeBayDashboard, useeBayItemLookup } from '@/hooks/use-ebay'
import { useeBayAuth } from '@/hooks/use-ebay-auth'
import { formatCurrency, formatNumber, cn } from '@/lib/utils'
import {
  ShoppingBag,
  TrendingUp,
  Gavel,
  Tag,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  MapPin,
  Search,
  Package,
  User,
  Star,
  X,
  Lock,
  Unlock,
  LogOut,
  Shield
} from 'lucide-react'
import Image from 'next/image'

interface EBayDashboardWidgetProps {
  className?: string
}

function EBayAuthSection() {
  const { authStatus, isLoading, error, initiateAuth, logout, needsAuth, user } = useeBayAuth()
  
  if (isLoading) {
    return (
      <div className="p-4 bg-black/20 rounded-lg border border-white/10">
        <div className="flex items-center gap-2">
          <LoadingSpinner className="h-4 w-4" />
          <span className="text-sm text-gray-400">Checking authentication...</span>
        </div>
      </div>
    )
  }
  
  if (needsAuth || authStatus?.expired || authStatus?.invalid) {
    return (
      <div className="p-4 bg-black/20 rounded-lg border border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-red-400" />
            <div>
              <p className="text-sm font-medium text-white">Authentication Required</p>
              <p className="text-xs text-gray-400">
                {authStatus?.expired ? 'Token expired' : authStatus?.invalid ? 'Token invalid' : 'Not authenticated'}
              </p>
            </div>
          </div>
          <Button 
            variant="yahuti" 
            size="sm" 
            onClick={() => initiateAuth()}
            className="text-xs"
          >
            <Shield className="h-3 w-3 mr-1" />
            Authenticate
          </Button>
        </div>
        {error && (
          <div className="mt-2 p-2 bg-red-900/20 border border-red-500/30 rounded text-xs text-red-400">
            {error}
          </div>
        )}
      </div>
    )
  }
  
  if (authStatus?.authenticated && user) {
    return (
      <div className="p-4 bg-green-900/20 rounded-lg border border-green-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Unlock className="h-4 w-4 text-green-400" />
            <div>
              <p className="text-sm font-medium text-white">
                {user.firstName ? `${user.firstName} ${user.lastName}` : user.username}
              </p>
              <p className="text-xs text-gray-400">eBay authenticated</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={logout}
            className="text-xs text-red-400 hover:text-red-300"
          >
            <LogOut className="h-3 w-3 mr-1" />
            Logout
          </Button>
        </div>
        {authStatus.tokenInfo && (
          <div className="mt-2 text-xs text-gray-500">
            Token expires: {new Date(authStatus.tokenInfo.expiresAt).toLocaleString()}
          </div>
        )}
      </div>
    )
  }
  
  return null
}

function EBayItemLookupModal() {
  const [itemId, setItemId] = useState('')
  const { data, isLoading, error, lookupItem, clearData } = useeBayItemLookup()
  const [isOpen, setIsOpen] = useState(false)

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault()
    if (itemId.trim()) {
      lookupItem(itemId.trim())
    }
  }

  const handleClear = () => {
    setItemId('')
    clearData()
  }

  const handleClose = () => {
    setIsOpen(false)
    setItemId('')
    clearData()
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="yahutiOutline" size="sm" className="w-full text-xs">
          <Search className="h-3 w-3 mr-2" />
          Item Lookup Tool
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            eBay Item Lookup
          </DialogTitle>
          <DialogDescription>
            Enter an eBay item ID to get detailed information from the sandbox
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search Form */}
          <form onSubmit={handleLookup} className="flex gap-2">
            <Input
              placeholder="Enter eBay Item ID (e.g., 12345, 67890)"
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="flex-1"
              disabled={isLoading}
            />
            <Button 
              type="submit" 
              disabled={isLoading || !itemId.trim()}
              className="px-6"
            >
              {isLoading ? <LoadingSpinner className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </Button>
            {data && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClear}
                className="px-3"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </form>

          {/* Sample IDs */}
          <div className="text-xs text-gray-400">
            Try sample IDs: 
            <Button 
              variant="link" 
              className="h-auto p-0 ml-1 text-xs text-blue-400" 
              onClick={() => setItemId('12345')}
            >
              12345
            </Button>
            {', '}
            <Button 
              variant="link" 
              className="h-auto p-0 text-xs text-blue-400" 
              onClick={() => setItemId('67890')}
            >
              67890
            </Button>
          </div>

          {/* Error State */}
          {error && (
            <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <span className="text-sm text-red-400">{error}</span>
              </div>
            </div>
          )}

          {/* Results */}
          {data?.success && data.item && (
            <div className="space-y-4">
              {/* Data Source Indicator */}
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs">
                  {data.dataSource}
                </Badge>
                {data.note && (
                  <span className="text-xs text-gray-500">{data.note}</span>
                )}
              </div>

              {/* Item Details */}
              <div className="bg-black/20 rounded-lg border border-white/10 p-4">
                <div className="flex gap-4">
                  {/* Image */}
                  <div className="relative w-24 h-24 flex-shrink-0">
                    <Image
                      src={data.item.imageUrl}
                      alt={data.item.title}
                      fill
                      className="object-cover rounded"
                      sizes="96px"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <h3 className="font-medium text-white">
                      {data.item.title}
                    </h3>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-yahuti-gold-500 font-bold">
                        {formatCurrency(data.item.price, data.item.currency)}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {data.item.condition}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <div className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        <span>{data.item.category}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{data.item.location}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1 text-gray-400">
                        <User className="h-3 w-3" />
                        <span>{data.item.seller.username}</span>
                      </div>
                      <div className="flex items-center gap-1 text-green-400">
                        <Star className="h-3 w-3" />
                        <span>{data.item.seller.feedback}% feedback</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {data.item.description && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-sm text-gray-300">
                      {data.item.description}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-3 pt-3 border-t border-white/10 flex gap-2">
                  <Button 
                    size="sm" 
                    variant="yahutiOutline"
                    onClick={() => window.open(data.item?.webUrl, '_blank')}
                    className="text-xs"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View on eBay
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="text-xs"
                    onClick={() => {
                      if (data.item) {
                        navigator.clipboard.writeText(`${data.item.title} - ${formatCurrency(data.item.price, data.item.currency)}`)
                      }
                    }}
                  >
                    Copy Details
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!data && !isLoading && !error && (
            <div className="text-center py-8 text-gray-400">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Enter an eBay item ID to get started</p>
              <p className="text-xs mt-1">Test your eBay sandbox integration</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function EBayDashboardWidget({ className }: EBayDashboardWidgetProps) {
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

        {/* eBay Authentication */}
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-3">eBay Authentication</h4>
          <EBayAuthSection />
        </div>

        {/* eBay Tools */}
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-3">eBay Tools</h4>
          <div className="space-y-2">
            <EBayItemLookupModal />
            <Button variant="ghost" size="sm" className="w-full text-xs">
              <Package className="h-3 w-3 mr-2" />
              Manage Inventory
            </Button>
          </div>
        </div>

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