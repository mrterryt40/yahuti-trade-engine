import { CommandDeck } from '@/components/command-deck'
import { Suspense } from 'react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export const dynamic = 'force-dynamic'

export default function HomePage() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="border-b border-yahuti-gold-500/20 bg-gradient-to-r from-yahuti-maroon-900/50 to-transparent p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-heading font-bold yahuti-gradient">
              Command Deck
            </h1>
            <p className="text-muted-foreground mt-1">
              Your sovereign control center
            </p>
          </div>
          
          {/* Global Controls */}
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm text-muted-foreground">System Status</div>
              <div className="flex items-center space-x-2 mt-1">
                <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-green-400">All Systems Operational</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        <Suspense fallback={<LoadingSpinner />}>
          <CommandDeck />
        </Suspense>
      </div>
    </div>
  )
}