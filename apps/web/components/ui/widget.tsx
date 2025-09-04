"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card"
import { LoadingSpinner } from "./loading-spinner"
import { Badge } from "./badge"
import { cn, formatCurrency, formatNumber, formatPercentage } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react"
import type { WidgetProps } from "@/types"

interface KPIWidgetProps extends WidgetProps {
  icon?: React.ReactNode
  subtitle?: string
  status?: 'good' | 'warning' | 'error' | 'neutral'
  showTrend?: boolean
  clickable?: boolean
  onClick?: () => void
}

export function KPIWidget({
  title,
  value,
  change,
  changeType = 'neutral',
  trend,
  loading = false,
  error,
  className,
  icon,
  subtitle,
  status = 'neutral',
  showTrend = true,
  clickable = false,
  onClick,
  ...props
}: KPIWidgetProps) {
  const formatValue = (val: string | number): string => {
    if (typeof val === 'string') return val
    
    // Try to infer format from the title or value type
    if (title.toLowerCase().includes('rate') || title.toLowerCase().includes('%')) {
      return formatPercentage(val)
    }
    if (title.toLowerCase().includes('$') || title.toLowerCase().includes('profit') || 
        title.toLowerCase().includes('cost') || title.toLowerCase().includes('revenue')) {
      return formatCurrency(val)
    }
    return formatNumber(val)
  }

  const getChangeIcon = () => {
    switch (changeType) {
      case 'positive':
        return <TrendingUp className="h-3 w-3 text-green-500" />
      case 'negative':
        return <TrendingDown className="h-3 w-3 text-red-500" />
      default:
        return <Minus className="h-3 w-3 text-gray-400" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'good':
        return 'border-green-500/30 bg-green-500/5'
      case 'warning':
        return 'border-yellow-500/30 bg-yellow-500/5'
      case 'error':
        return 'border-red-500/30 bg-red-500/5'
      default:
        return ''
    }
  }

  const getChangeColor = () => {
    switch (changeType) {
      case 'positive':
        return 'text-green-500'
      case 'negative':
        return 'text-red-500'
      default:
        return 'text-gray-400'
    }
  }

  if (error) {
    return (
      <Card className={cn("border-red-500/30 bg-red-900/10", className)} {...props}>
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-400">Failed to load</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card 
      className={cn(
        "transition-all duration-200 hover:shadow-lg",
        getStatusColor(),
        clickable && "cursor-pointer hover:scale-[1.02]",
        className
      )}
      onClick={clickable ? onClick : undefined}
      {...props}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {subtitle && (
            <CardDescription className="text-xs mt-1">
              {subtitle}
            </CardDescription>
          )}
        </div>
        {icon && (
          <div className="text-muted-foreground">
            {icon}
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <LoadingSpinner size="sm" />
          </div>
        ) : (
          <div>
            <div className="flex items-baseline space-x-2">
              <div className="text-2xl font-bold text-foreground">
                {formatValue(value)}
              </div>
              {change !== undefined && showTrend && (
                <div className={cn("flex items-center text-xs font-medium", getChangeColor())}>
                  {getChangeIcon()}
                  <span className="ml-1">{Math.abs(change).toFixed(1)}%</span>
                </div>
              )}
            </div>

            {/* Mini trend chart */}
            {trend && trend.length > 0 && (
              <div className="mt-3 flex items-end space-x-1 h-6">
                {trend.slice(-8).map((point, index) => {
                  const maxValue = Math.max(...trend)
                  const height = maxValue > 0 ? (point / maxValue) * 100 : 0
                  
                  return (
                    <div
                      key={index}
                      className={cn(
                        "flex-1 rounded-sm transition-all duration-300",
                        changeType === 'positive' && "bg-green-500/60",
                        changeType === 'negative' && "bg-red-500/60",
                        changeType === 'neutral' && "bg-yahuti-gold-500/60"
                      )}
                      style={{
                        height: `${Math.max(height, 8)}%`, // Minimum height for visibility
                      }}
                    />
                  )
                })}
              </div>
            )}

            {/* Status badge */}
            {status !== 'neutral' && (
              <div className="mt-2">
                <Badge 
                  variant={
                    status === 'good' ? 'success' : 
                    status === 'warning' ? 'warning' : 'error'
                  }
                  size="sm"
                >
                  {status === 'good' && 'On Target'}
                  {status === 'warning' && 'Needs Attention'}
                  {status === 'error' && 'Critical'}
                </Badge>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Specialized widgets for different data types
interface MetricWidgetProps {
  title: string
  value: number
  format: 'currency' | 'percentage' | 'number'
  target?: number
  trend?: number[]
  className?: string
}

export function MetricWidget({ 
  title, 
  value, 
  format, 
  target, 
  trend, 
  className 
}: MetricWidgetProps) {
  const change = target ? ((value - target) / target) * 100 : undefined
  const changeType = change ? (change >= 0 ? 'positive' : 'negative') : 'neutral'
  const status = target ? 
    (value >= target * 0.95 ? 'good' : 
     value >= target * 0.8 ? 'warning' : 'error') 
    : 'neutral'

  return (
    <KPIWidget
      title={title}
      value={format === 'currency' ? formatCurrency(value) : 
            format === 'percentage' ? formatPercentage(value) : 
            formatNumber(value)}
      change={change}
      changeType={changeType}
      trend={trend}
      status={status}
      className={className}
      subtitle={target ? `Target: ${
        format === 'currency' ? formatCurrency(target) :
        format === 'percentage' ? formatPercentage(target) :
        formatNumber(target)
      }` : undefined}
    />
  )
}

// Quick action widget
interface ActionWidgetProps {
  title: string
  description: string
  action: () => void
  actionLabel: string
  icon?: React.ReactNode
  variant?: 'default' | 'yahuti' | 'success' | 'warning' | 'destructive'
  disabled?: boolean
  loading?: boolean
  className?: string
}

export function ActionWidget({
  title,
  description,
  action,
  actionLabel,
  icon,
  variant = 'default',
  disabled = false,
  loading = false,
  className
}: ActionWidgetProps) {
  return (
    <Card className={cn("hover:shadow-lg transition-shadow", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <button
          onClick={action}
          disabled={disabled || loading}
          className={cn(
            "w-full px-4 py-2 rounded-md font-medium transition-colors",
            variant === 'yahuti' && "bg-yahuti-maroon-800 text-white hover:bg-yahuti-maroon-700",
            variant === 'success' && "bg-green-600 text-white hover:bg-green-700",
            variant === 'warning' && "bg-yellow-600 text-white hover:bg-yellow-700",
            variant === 'destructive' && "bg-red-600 text-white hover:bg-red-700",
            variant === 'default' && "bg-gray-600 text-white hover:bg-gray-700",
            (disabled || loading) && "opacity-50 cursor-not-allowed"
          )}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <LoadingSpinner size="xs" />
              Loading...
            </div>
          ) : (
            actionLabel
          )}
        </button>
      </CardContent>
    </Card>
  )
}