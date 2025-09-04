import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Status variants
        success: "border-transparent bg-green-500 text-white",
        warning: "border-transparent bg-yellow-500 text-black",
        error: "border-transparent bg-red-500 text-white",
        info: "border-transparent bg-blue-500 text-white",
        // Yahuti variants
        yahuti: "border-transparent bg-yahuti-maroon-800 text-white shadow-sm",
        yahutiGold: "border-transparent bg-yahuti-gold-500 text-black font-bold shadow-sm",
        yahutiOutline: "border-yahuti-gold-500 bg-transparent text-yahuti-gold-500",
        // System status variants
        online: "border-transparent bg-green-500 text-white animate-pulse",
        offline: "border-transparent bg-gray-500 text-white",
        maintenance: "border-transparent bg-orange-500 text-white",
        // Trading status variants
        active: "border-transparent bg-blue-500 text-white",
        paused: "border-transparent bg-yellow-600 text-white",
        stopped: "border-transparent bg-red-500 text-white",
        pending: "border-transparent bg-gray-400 text-white",
        completed: "border-transparent bg-green-500 text-white",
        failed: "border-transparent bg-red-600 text-white",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  pulse?: boolean
}

function Badge({ className, variant, size, pulse = false, ...props }: BadgeProps) {
  return (
    <div 
      className={cn(
        badgeVariants({ variant, size }),
        pulse && "animate-pulse",
        className
      )} 
      {...props} 
    />
  )
}

// Status Badge component for system/module status
interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: 'online' | 'offline' | 'maintenance' | 'active' | 'inactive' | 'error' | 'warning' | 'success' | 'pending' | 'completed' | 'failed'
  showDot?: boolean
}

function StatusBadge({ status, showDot = true, className, children, ...props }: StatusBadgeProps) {
  const getVariant = (status: string) => {
    switch (status) {
      case 'online':
      case 'active':
      case 'success':
      case 'completed':
        return 'success'
      case 'offline':
      case 'inactive':
        return 'outline'
      case 'maintenance':
      case 'warning':
        return 'warning'
      case 'error':
      case 'failed':
        return 'error'
      case 'pending':
        return 'info'
      default:
        return 'default'
    }
  }

  const getDotColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'active':
      case 'success':
      case 'completed':
        return 'bg-green-500'
      case 'warning':
      case 'maintenance':
        return 'bg-yellow-500'
      case 'error':
      case 'failed':
        return 'bg-red-500'
      case 'offline':
      case 'inactive':
        return 'bg-gray-400'
      case 'pending':
        return 'bg-blue-500'
      default:
        return 'bg-gray-400'
    }
  }

  return (
    <Badge 
      variant={getVariant(status)}
      className={cn("gap-1", className)}
      pulse={status === 'online' || status === 'active'}
      {...props}
    >
      {showDot && (
        <div className={cn("w-1.5 h-1.5 rounded-full", getDotColor(status))} />
      )}
      {children || status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}

export { Badge, StatusBadge, badgeVariants }