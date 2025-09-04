"use client"

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import {
  Crown,
  LayoutDashboard,
  Target,
  TrendingUp,
  Lock,
  DollarSign,
  Shield,
  Brain,
  BookOpen,
  FileText,
  Settings,
  Play,
  Pause,
  Square,
  ArrowUpCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { NavigationItem, QuickAction } from '@/types'

interface NavigationProps {
  className?: string
}

export function Navigation({ className }: NavigationProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isActionsLoading, setIsActionsLoading] = useState<Record<string, boolean>>({})

  // Navigation menu items
  const navigationItems: NavigationItem[] = [
    {
      id: 'command-deck',
      label: 'Command Deck',
      icon: 'LayoutDashboard',
      path: '/',
      active: pathname === '/',
    },
    {
      id: 'hunt-board',
      label: 'Hunt Board',
      icon: 'Target',
      path: '/hunt-board',
      active: pathname.startsWith('/hunt-board'),
      badge: '12', // Active opportunities
    },
    {
      id: 'market-edge',
      label: 'Market Edge',
      icon: 'TrendingUp',
      path: '/market-edge',
      active: pathname.startsWith('/market-edge'),
    },
    {
      id: 'vault',
      label: 'Vault',
      icon: 'Lock',
      path: '/vault',
      active: pathname.startsWith('/vault'),
    },
    {
      id: 'cashflow',
      label: 'Cashflow',
      icon: 'DollarSign',
      path: '/cashflow',
      active: pathname.startsWith('/cashflow'),
    },
    {
      id: 'risk-compliance',
      label: 'Risk & Compliance',
      icon: 'Shield',
      path: '/risk',
      active: pathname.startsWith('/risk'),
    },
    {
      id: 'brains',
      label: 'Brains',
      icon: 'Brain',
      path: '/brains',
      active: pathname.startsWith('/brains'),
    },
    {
      id: 'playbooks',
      label: 'Playbooks',
      icon: 'BookOpen',
      path: '/playbooks',
      active: pathname.startsWith('/playbooks'),
    },
    {
      id: 'logs-audit',
      label: 'Logs & Audit',
      icon: 'FileText',
      path: '/logs',
      active: pathname.startsWith('/logs'),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: 'Settings',
      path: '/settings',
      active: pathname.startsWith('/settings'),
    },
  ]

  // Quick action buttons
  const quickActions: QuickAction[] = [
    {
      id: 'start',
      label: 'Start',
      icon: 'Play',
      variant: 'success',
      action: handleStart,
      loading: isActionsLoading.start,
    },
    {
      id: 'pause',
      label: 'Pause',
      icon: 'Pause',
      variant: 'warning',
      action: handlePause,
      loading: isActionsLoading.pause,
    },
    {
      id: 'kill',
      label: 'Kill',
      icon: 'Square',
      variant: 'destructive',
      action: handleKill,
      loading: isActionsLoading.kill,
    },
    {
      id: 'withdraw',
      label: 'Withdraw',
      icon: 'ArrowUpCircle',
      variant: 'yahuti',
      action: handleWithdraw,
      loading: isActionsLoading.withdraw,
    },
  ]

  // Icon mapping
  const iconMap = {
    LayoutDashboard,
    Target,
    TrendingUp,
    Lock,
    DollarSign,
    Shield,
    Brain,
    BookOpen,
    FileText,
    Settings,
    Play,
    Pause,
    Square,
    ArrowUpCircle,
  }

  // Action handlers
  async function handleStart() {
    setIsActionsLoading(prev => ({ ...prev, start: true }))
    try {
      // API call to start the engine
      console.log('Starting Yahuti Trade Engine...')
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simulated delay
    } catch (error) {
      console.error('Failed to start engine:', error)
    } finally {
      setIsActionsLoading(prev => ({ ...prev, start: false }))
    }
  }

  async function handlePause() {
    setIsActionsLoading(prev => ({ ...prev, pause: true }))
    try {
      // API call to pause the engine
      console.log('Pausing Yahuti Trade Engine...')
      await new Promise(resolve => setTimeout(resolve, 1500))
    } catch (error) {
      console.error('Failed to pause engine:', error)
    } finally {
      setIsActionsLoading(prev => ({ ...prev, pause: false }))
    }
  }

  async function handleKill() {
    setIsActionsLoading(prev => ({ ...prev, kill: true }))
    try {
      // API call to kill the engine
      console.log('Stopping Yahuti Trade Engine...')
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error('Failed to stop engine:', error)
    } finally {
      setIsActionsLoading(prev => ({ ...prev, kill: false }))
    }
  }

  async function handleWithdraw() {
    setIsActionsLoading(prev => ({ ...prev, withdraw: true }))
    try {
      // API call to withdraw funds
      console.log('Initiating withdrawal...')
      await new Promise(resolve => setTimeout(resolve, 2500))
    } catch (error) {
      console.error('Failed to withdraw:', error)
    } finally {
      setIsActionsLoading(prev => ({ ...prev, withdraw: false }))
    }
  }

  function getIcon(iconName: string) {
    const Icon = iconMap[iconName as keyof typeof iconMap]
    return Icon || LayoutDashboard
  }

  return (
    <aside
      className={cn(
        "flex flex-col bg-gradient-to-b from-yahuti-maroon-900 to-black border-r border-yahuti-gold-500/20 shadow-2xl transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Header with Logo */}
      <div className="flex items-center justify-between p-4 border-b border-yahuti-gold-500/20">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <Crown className="h-6 w-6 text-yahuti-gold-500" />
            <div>
              <h1 className="text-lg font-heading font-bold text-yahuti-gold-500">
                YAHUTI
              </h1>
              <p className="text-xs text-gray-400 uppercase tracking-wider">
                Trade Engine™
              </p>
            </div>
          </div>
        )}
        
        {isCollapsed && (
          <Crown className="h-8 w-8 text-yahuti-gold-500 mx-auto" />
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label={isCollapsed ? "Expand navigation" : "Collapse navigation"}
          title={isCollapsed ? "Expand navigation" : "Collapse navigation"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* System Status */}
      <div className="p-4 border-b border-yahuti-gold-500/20">
        <div className={cn("flex items-center gap-2", isCollapsed && "justify-center")}>
          <StatusBadge status="online" showDot />
          {!isCollapsed && (
            <div>
              <p className="text-xs text-white font-medium">System Online</p>
              <p className="text-xs text-gray-400">All modules active</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-2">
        <ul className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = getIcon(item.icon)
            
            return (
              <li key={item.id}>
                <Link
                  href={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                    item.active
                      ? "bg-yahuti-gold-500/20 text-yahuti-gold-500 shadow-md border border-yahuti-gold-500/30"
                      : "text-gray-300 hover:text-white hover:bg-white/5",
                    item.disabled && "opacity-50 cursor-not-allowed",
                    isCollapsed && "justify-center px-2"
                  )}
                >
                  <Icon className={cn("h-5 w-5 flex-shrink-0", item.active && "text-yahuti-gold-500")} />
                  
                  {!isCollapsed && (
                    <>
                      <span className="truncate">{item.label}</span>
                      
                      {item.badge && (
                        <span className="ml-auto bg-yahuti-gold-500 text-black text-xs font-bold px-1.5 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}

                  {/* Tooltip for collapsed state */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-black text-white text-sm rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                      {item.label}
                      {item.badge && (
                        <span className="ml-2 bg-yahuti-gold-500 text-black text-xs font-bold px-1 py-0.5 rounded">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Quick Actions */}
      <div className="p-4 border-t border-yahuti-gold-500/20 space-y-2">
        {!isCollapsed && (
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Quick Actions
          </h3>
        )}
        
        <div className={cn("grid gap-2", isCollapsed ? "grid-cols-1" : "grid-cols-2")}>
          {quickActions.map((action) => {
            const Icon = getIcon(action.icon)
            
            return (
              <Button
                key={action.id}
                variant={action.variant}
                size={isCollapsed ? "icon" : "sm"}
                onClick={action.action}
                disabled={action.disabled}
                loading={action.loading}
                className={cn(
                  "relative group",
                  isCollapsed && "h-8 w-8"
                )}
              >
                <Icon className="h-4 w-4" />
                {!isCollapsed && <span className="ml-1">{action.label}</span>}
                
                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-black text-white text-sm rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                    {action.label}
                  </div>
                )}
              </Button>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-yahuti-gold-500/20">
          <p className="text-xs text-gray-500 text-center">
            © 2024 Yahuti Nation
          </p>
        </div>
      )}
    </aside>
  )
}