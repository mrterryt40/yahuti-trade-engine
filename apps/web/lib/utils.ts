import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format number as currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

/**
 * Format number with commas
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return 0
  return ((current - previous) / previous) * 100
}

/**
 * Format percentage with sign
 */
export function formatPercentage(percentage: number, decimals: number = 2): string {
  const sign = percentage >= 0 ? '+' : ''
  return `${sign}${percentage.toFixed(decimals)}%`
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

/**
 * Sleep utility for delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Generate random ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

/**
 * Get status color based on value
 */
export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'active':
    case 'online':
    case 'success':
    case 'completed':
      return 'text-green-500'
    case 'warning':
    case 'pending':
      return 'text-yellow-500'
    case 'error':
    case 'offline':
    case 'failed':
      return 'text-red-500'
    case 'paused':
    case 'inactive':
      return 'text-gray-500'
    default:
      return 'text-gray-400'
  }
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Get relative time string
 */
export function getRelativeTime(date: Date | string): string {
  const now = new Date()
  const targetDate = typeof date === 'string' ? new Date(date) : date
  const diffMs = now.getTime() - targetDate.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return targetDate.toLocaleDateString()
}