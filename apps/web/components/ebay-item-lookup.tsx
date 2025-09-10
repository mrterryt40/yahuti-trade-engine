"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useeBayItemLookup } from '@/hooks/use-ebay'
import { formatCurrency, cn } from '@/lib/utils'
import {
  Search,
  ExternalLink,
  MapPin,
  Star,
  Package,
  AlertCircle,
  User,
  X
} from 'lucide-react'
import Image from 'next/image'

interface EBayItemLookupProps {
  className?: string
}

export function EBayItemLookup({ className }: EBayItemLookupProps) {
  const [itemId, setItemId] = useState('')
  const { data, isLoading, error, lookupItem, clearData } = useeBayItemLookup()

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

  return (
    <Card variant="yahuti" className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          eBay Item Lookup
        </CardTitle>
        <CardDescription>
          Enter an eBay item ID to get detailed information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
                  <h3 className="font-medium text-white truncate">
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
                  <p className="text-sm text-gray-300 line-clamp-2">
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
      </CardContent>
    </Card>
  )
}