// Base types
export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
}

// KPI Types
export interface KPIData {
  todayNet: number
  mtdNet: number
  ytdNet: number
  bankroll: number
  cashToTrust: number
  flipsToday: number
  avgProfitPerFlip: number
  disputeRate: number
  successRate: number
  totalVolume: number
  activeListings: number
  watchedListings: number
}

export interface KPIMetric {
  label: string
  value: number | string
  change?: number
  changeType?: 'increase' | 'decrease' | 'neutral'
  format?: 'currency' | 'percentage' | 'number'
  trend?: number[]
}

// System Status Types
export type SystemStatus = 'online' | 'offline' | 'maintenance' | 'error'
export type ModuleStatus = 'active' | 'inactive' | 'error' | 'warning'

export interface SystemHealth {
  status: SystemStatus
  uptime: number
  lastUpdate: string
  modules: {
    [key: string]: {
      status: ModuleStatus
      message?: string
      lastCheck: string
    }
  }
}

// Trade Types
export interface Trade extends BaseEntity {
  platform: string
  product: string
  buyPrice: number
  sellPrice: number
  profit: number
  profitMargin: number
  quantity: number
  status: 'pending' | 'active' | 'completed' | 'cancelled' | 'failed'
  startTime: string
  endTime?: string
  fees: number
  tags: string[]
}

export interface TradeOpportunity {
  id: string
  platform: string
  product: string
  buyPrice: number
  potentialSellPrice: number
  estimatedProfit: number
  profitMargin: number
  confidence: number
  risk: 'low' | 'medium' | 'high'
  timeToProfit: number
  marketTrend: 'up' | 'down' | 'stable'
}

// Alert Types
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical'
export type AlertCategory = 'system' | 'trade' | 'risk' | 'market' | 'security'

export interface Alert extends BaseEntity {
  title: string
  message: string
  severity: AlertSeverity
  category: AlertCategory
  read: boolean
  acknowledged: boolean
  data?: any
}

// Navigation Types
export interface NavigationItem {
  id: string
  label: string
  icon: string
  path: string
  active?: boolean
  badge?: string | number
  disabled?: boolean
}

export interface QuickAction {
  id: string
  label: string
  icon: string
  variant: 'default' | 'success' | 'warning' | 'destructive'
  action: () => void
  loading?: boolean
  disabled?: boolean
}

// Risk Management Types
export interface RiskMetrics {
  maxDrawdown: number
  currentDrawdown: number
  sharpeRatio: number
  winRate: number
  avgWin: number
  avgLoss: number
  profitFactor: number
  totalExposure: number
  maxExposure: number
}

export interface RiskLimits {
  maxDailyLoss: number
  maxTradeSize: number
  maxExposurePerPlatform: number
  maxOpenTrades: number
  stopLossThreshold: number
}

// Market Types
export interface MarketEdge {
  totalOpportunities: number
  avgProfitMargin: number
  bestOpportunity: TradeOpportunity
  marketSentiment: 'bullish' | 'bearish' | 'neutral'
  volatilityIndex: number
  recommendedAction: string
}

// Vault Types
export interface VaultBalance {
  available: number
  invested: number
  reserved: number
  total: number
  pendingWithdrawals: number
  pendingDeposits: number
}

export interface Transaction extends BaseEntity {
  type: 'deposit' | 'withdrawal' | 'trade_profit' | 'trade_loss' | 'fee' | 'adjustment'
  amount: number
  balance: number
  description: string
  reference?: string
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
}

// Component Props Types
export interface WidgetProps {
  title: string
  value: string | number
  change?: number
  changeType?: 'positive' | 'negative' | 'neutral'
  trend?: number[]
  loading?: boolean
  error?: string
  className?: string
}

export interface StatusIndicatorProps {
  status: SystemStatus | ModuleStatus
  label: string
  message?: string
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data: T
  message?: string
  timestamp: string
}

export interface PaginatedResponse<T = any> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Form Types
export interface LoginCredentials {
  username: string
  password: string
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'auto'
  notifications: {
    email: boolean
    push: boolean
    desktop: boolean
    critical: boolean
  }
  trading: {
    autoStart: boolean
    maxConcurrentTrades: number
    riskTolerance: 'low' | 'medium' | 'high'
  }
}

// Error Types
export interface AppError {
  code: string
  message: string
  details?: any
  timestamp: string
}

// Chart Types
export interface ChartData {
  name: string
  value: number
  timestamp?: string
}

export interface TrendData {
  period: string
  profit: number
  volume: number
  trades: number
}