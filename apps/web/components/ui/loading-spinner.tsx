import * as React from "react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const spinnerVariants = cva(
  "animate-spin rounded-full border-solid border-current border-r-transparent",
  {
    variants: {
      size: {
        xs: "h-3 w-3 border",
        sm: "h-4 w-4 border",
        default: "h-6 w-6 border-2",
        lg: "h-8 w-8 border-2",
        xl: "h-12 w-12 border-4",
      },
      variant: {
        default: "text-primary",
        secondary: "text-secondary",
        yahuti: "text-yahuti-gold-500",
        white: "text-white",
        muted: "text-muted-foreground",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
)

export interface LoadingSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  label?: string
  center?: boolean
}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, size, variant, label, center = false, ...props }, ref) => {
    const spinner = (
      <div
        ref={ref}
        className={cn(spinnerVariants({ size, variant }), className)}
        role="status"
        aria-label={label || "Loading"}
        {...props}
      >
        <span className="sr-only">{label || "Loading..."}</span>
      </div>
    )

    if (center) {
      return (
        <div className="flex items-center justify-center w-full h-full min-h-[100px]">
          <div className="flex flex-col items-center gap-2">
            {spinner}
            {label && (
              <span className="text-sm text-muted-foreground">{label}</span>
            )}
          </div>
        </div>
      )
    }

    return spinner
  }
)
LoadingSpinner.displayName = "LoadingSpinner"

// Yahuti-specific loading animation
interface YahutiLoaderProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const YahutiLoader: React.FC<YahutiLoaderProps> = ({ 
  size = 'md', 
  className 
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12'
  }

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className={cn("relative", sizeClasses[size])}>
        {/* Crown icon with glow effect */}
        <div className="absolute inset-0 animate-glow">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-full h-full text-yahuti-gold-500"
          >
            <path
              d="M5 16L3 7L8 10L12 4L16 10L21 7L19 16H5Z"
              fill="currentColor"
              className="animate-pulse"
            />
            <path
              d="M5 16H19V18H5V16Z"
              fill="currentColor"
            />
          </svg>
        </div>
        
        {/* Rotating ring */}
        <div className="absolute inset-0 animate-spin">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-full h-full"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="url(#gradient)"
              strokeWidth="1"
              strokeLinecap="round"
              strokeDasharray="60 20"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FFD700" stopOpacity="0" />
                <stop offset="100%" stopColor="#FFD700" stopOpacity="1" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    </div>
  )
}

// Page loader component
interface PageLoaderProps {
  message?: string
  showLogo?: boolean
}

const PageLoader: React.FC<PageLoaderProps> = ({ 
  message = "Loading Yahuti Trade Engine...", 
  showLogo = true 
}) => {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-6">
        {showLogo && (
          <div className="text-center">
            <h1 className="text-4xl font-heading font-bold text-yahuti-gold-500 mb-2">
              YAHUTI
            </h1>
            <p className="text-sm text-gray-400 uppercase tracking-wider">
              Trade Engine™
            </p>
          </div>
        )}
        
        <YahutiLoader size="lg" />
        
        <p className="text-sm text-muted-foreground animate-pulse">
          {message}
        </p>
      </div>
    </div>
  )
}

// Button loading state
interface ButtonLoadingProps {
  size?: 'xs' | 'sm' | 'default'
}

const ButtonLoading: React.FC<ButtonLoadingProps> = ({ size = 'sm' }) => {
  return (
    <LoadingSpinner
      size={size}
      variant="white"
      className="mr-2"
    />
  )
}

export { 
  LoadingSpinner, 
  YahutiLoader, 
  PageLoader, 
  ButtonLoading, 
  spinnerVariants 
}