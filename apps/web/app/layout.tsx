import type { Metadata } from 'next'
import { Inter, Cinzel_Decorative } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { Navigation } from '@/components/navigation'
import { Toaster } from '@/components/ui/toast-simple'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-sans',
})

const cinzel = Cinzel_Decorative({ 
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-heading',
})

export const metadata: Metadata = {
  title: 'Yahuti Trade Engine™',
  description: 'Your Marketplace. Your Rules. Your Profit.',
  keywords: 'digital arbitrage, marketplace automation, profit engine, yahuti nation',
  authors: [{ name: 'Yahuti Nation' }],
  viewport: 'width=device-width, initial-scale=1',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${cinzel.variable} font-sans`}>
        <Providers>
          <div className="flex min-h-screen bg-black">
            <Navigation />
            <main className="flex-1 overflow-hidden">
              {children}
            </main>
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}