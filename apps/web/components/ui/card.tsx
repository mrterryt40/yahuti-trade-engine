import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: 'default' | 'yahuti' | 'glass' | 'bordered'
  }
>(({ className, variant = 'default', ...props }, ref) => {
  const variantStyles = {
    default: "bg-card text-card-foreground",
    yahuti: "bg-gradient-to-br from-yahuti-maroon-900/20 to-black border-yahuti-gold-500/20 shadow-lg hover:shadow-yahuti-gold-500/10",
    glass: "bg-black/40 backdrop-blur-sm border-white/10 shadow-xl",
    bordered: "bg-card text-card-foreground border-2 border-yahuti-gold-500/30"
  }
  
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border shadow-sm",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  )
})
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement> & {
    level?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  }
>(({ className, level = 'h3', children, ...props }, ref) => {
  const Component = level
  
  return (
    <Component
      ref={ref}
      className={cn(
        "text-2xl font-semibold leading-none tracking-tight text-yahuti-gold-500",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  )
})
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }