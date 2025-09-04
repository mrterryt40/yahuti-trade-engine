"use client"

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiEndpoints } from '@/lib/api'
import type { KPIData, KPIMetric } from '@/types'

// Query keys
export const kpiKeys = {
  all: ['kpis'] as const,
  today: () => [...kpiKeys.all, 'today'] as const,
  mtd: () => [...kpiKeys.all, 'mtd'] as const,
  ytd: () => [...kpiKeys.all, 'ytd'] as const,
  summary: () => [...kpiKeys.all, 'summary'] as const,
}

// Main KPI hook
export function useKPIs(refetchInterval: number = 30000) {
  return useQuery({
    queryKey: kpiKeys.all,
    queryFn: async () => {
      const response = await apiEndpoints.kpis.getAll()
      return response.data as KPIData
    },
    refetchInterval,
    staleTime: 20000, // Consider data stale after 20 seconds
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

// Today's KPIs
export function useTodayKPIs() {
  return useQuery({
    queryKey: kpiKeys.today(),
    queryFn: async () => {
      const response = await apiEndpoints.kpis.getToday()
      return response.data as KPIData
    },
    refetchInterval: 10000, // Refresh every 10 seconds for real-time data
    staleTime: 5000,
    retry: 2,
  })
}

// Month-to-date KPIs
export function useMTDKPIs() {
  return useQuery({
    queryKey: kpiKeys.mtd(),
    queryFn: async () => {
      const response = await apiEndpoints.kpis.getMTD()
      return response.data as KPIData
    },
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
    retry: 2,
  })
}

// Year-to-date KPIs
export function useYTDKPIs() {
  return useQuery({
    queryKey: kpiKeys.ytd(),
    queryFn: async () => {
      const response = await apiEndpoints.kpis.getYTD()
      return response.data as KPIData
    },
    refetchInterval: 300000, // Refresh every 5 minutes
    staleTime: 120000,
    retry: 2,
  })
}

// KPI Summary with formatted metrics
export function useKPISummary() {
  const { data: kpiData, ...queryInfo } = useKPIs()

  const formattedMetrics: KPIMetric[] | undefined = kpiData ? [
    {
      label: "Today's Net",
      value: kpiData.todayNet,
      format: 'currency',
      changeType: kpiData.todayNet >= 0 ? 'increase' : 'decrease',
      trend: [100, 150, 120, 180, 220, 190, kpiData.todayNet || 0],
    },
    {
      label: "MTD Net",
      value: kpiData.mtdNet,
      format: 'currency',
      changeType: kpiData.mtdNet >= 0 ? 'increase' : 'decrease',
    },
    {
      label: "Bankroll",
      value: kpiData.bankroll,
      format: 'currency',
    },
    {
      label: "Cash to Trust",
      value: kpiData.cashToTrust,
      format: 'currency',
    },
    {
      label: "Flips Today",
      value: kpiData.flipsToday,
      format: 'number',
    },
    {
      label: "Avg Profit/Flip",
      value: kpiData.avgProfitPerFlip,
      format: 'currency',
    },
    {
      label: "Success Rate",
      value: kpiData.successRate,
      format: 'percentage',
      changeType: kpiData.successRate >= 85 ? 'increase' : 'decrease',
    },
    {
      label: "Dispute Rate",
      value: kpiData.disputeRate,
      format: 'percentage',
      changeType: kpiData.disputeRate <= 5 ? 'increase' : 'decrease',
    },
    {
      label: "Total Volume",
      value: kpiData.totalVolume,
      format: 'currency',
    },
    {
      label: "Active Listings",
      value: kpiData.activeListings,
      format: 'number',
    },
    {
      label: "Watched Listings",
      value: kpiData.watchedListings,
      format: 'number',
    },
  ] : undefined

  return {
    ...queryInfo,
    data: kpiData,
    metrics: formattedMetrics,
  }
}

// Hook to invalidate KPI data
export function useInvalidateKPIs() {
  const queryClient = useQueryClient()

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: kpiKeys.all }),
    invalidateToday: () => queryClient.invalidateQueries({ queryKey: kpiKeys.today() }),
    invalidateMTD: () => queryClient.invalidateQueries({ queryKey: kpiKeys.mtd() }),
    invalidateYTD: () => queryClient.invalidateQueries({ queryKey: kpiKeys.ytd() }),
    refetchAll: () => queryClient.refetchQueries({ queryKey: kpiKeys.all }),
  }
}

// Performance metrics calculation hook
export function usePerformanceMetrics() {
  const { data: kpiData } = useKPIs()

  if (!kpiData) return null

  const performanceScore = calculatePerformanceScore(kpiData)
  const riskLevel = calculateRiskLevel(kpiData)
  const efficiency = calculateEfficiency(kpiData)

  return {
    performanceScore,
    riskLevel,
    efficiency,
    recommendations: getRecommendations(kpiData, performanceScore, riskLevel),
  }
}

// Utility functions
function calculatePerformanceScore(kpi: KPIData): number {
  // Weighted performance score based on key metrics
  const successWeight = kpi.successRate * 0.3
  const profitabilityWeight = Math.min((kpi.avgProfitPerFlip / 50) * 100, 100) * 0.3
  const volumeWeight = Math.min((kpi.totalVolume / 100000) * 100, 100) * 0.2
  const disputeWeight = Math.max(100 - (kpi.disputeRate * 10), 0) * 0.2

  return Math.round(successWeight + profitabilityWeight + volumeWeight + disputeWeight)
}

function calculateRiskLevel(kpi: KPIData): 'low' | 'medium' | 'high' {
  if (kpi.disputeRate > 10 || kpi.successRate < 70) return 'high'
  if (kpi.disputeRate > 5 || kpi.successRate < 85) return 'medium'
  return 'low'
}

function calculateEfficiency(kpi: KPIData): number {
  if (kpi.flipsToday === 0) return 0
  return Math.round((kpi.todayNet / kpi.flipsToday) * 100) / 100
}

function getRecommendations(
  kpi: KPIData, 
  performance: number, 
  risk: 'low' | 'medium' | 'high'
): string[] {
  const recommendations: string[] = []

  if (performance < 70) {
    recommendations.push("Consider adjusting trading parameters to improve performance")
  }

  if (risk === 'high') {
    recommendations.push("Implement stricter risk controls and reduce position sizes")
  }

  if (kpi.disputeRate > 8) {
    recommendations.push("Review product selection to reduce dispute rates")
  }

  if (kpi.successRate < 80) {
    recommendations.push("Analyze failed trades to identify improvement opportunities")
  }

  if (kpi.avgProfitPerFlip < 20) {
    recommendations.push("Focus on higher margin opportunities")
  }

  if (recommendations.length === 0) {
    recommendations.push("System performance is optimal - continue current strategy")
  }

  return recommendations
}

// Mock data for development
export const mockKPIData: KPIData = {
  todayNet: 1247.53,
  mtdNet: 18923.71,
  ytdNet: 156789.23,
  bankroll: 45678.90,
  cashToTrust: 12345.67,
  flipsToday: 23,
  avgProfitPerFlip: 54.24,
  disputeRate: 3.2,
  successRate: 89.7,
  totalVolume: 234567.89,
  activeListings: 156,
  watchedListings: 2341,
}