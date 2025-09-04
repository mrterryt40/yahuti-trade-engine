import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import { Lock, ArrowUpCircle, ArrowDownCircle, Shield, DollarSign, TrendingUp, History } from 'lucide-react'

export default function VaultPage() {
  const transactions = [
    {
      id: 1,
      type: 'deposit',
      amount: 2500,
      method: 'Bank Transfer',
      status: 'completed',
      timestamp: '2024-01-15 10:30 AM',
      reference: 'DEP-2024-001'
    },
    {
      id: 2,
      type: 'withdrawal',
      amount: 1200,
      method: 'PayPal',
      status: 'pending',
      timestamp: '2024-01-14 3:45 PM',
      reference: 'WTH-2024-023'
    },
    {
      id: 3,
      type: 'trade_profit',
      amount: 347,
      method: 'Auto Transfer',
      status: 'completed',
      timestamp: '2024-01-14 2:15 PM',
      reference: 'TRD-2024-156'
    }
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-yahuti-gold-500 mb-2">Vault</h1>
          <p className="text-gray-400">Secure fund management and transaction history</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="success" size="sm">
            <ArrowDownCircle className="h-4 w-4 mr-2" />
            Deposit
          </Button>
          <Button variant="warning" size="sm">
            <ArrowUpCircle className="h-4 w-4 mr-2" />
            Withdraw
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card variant="yahuti">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Available Balance</p>
                <p className="text-3xl font-bold text-yahuti-gold-500">$45,678.90</p>
                <p className="text-sm text-green-400 mt-1">+2.3% this month</p>
              </div>
              <Lock className="h-8 w-8 text-yahuti-gold-500" />
            </div>
          </CardContent>
        </Card>

        <Card variant="yahuti">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Pending Deposits</p>
                <p className="text-2xl font-bold text-blue-400">$2,500.00</p>
                <p className="text-sm text-gray-400 mt-1">2 transactions</p>
              </div>
              <ArrowDownCircle className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card variant="yahuti">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Reserved Funds</p>
                <p className="text-2xl font-bold text-orange-400">$8,234.56</p>
                <p className="text-sm text-gray-400 mt-1">Active trades</p>
              </div>
              <Shield className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="yahuti">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Manage your funds with secure transactions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="success" className="w-full" size="lg">
              <ArrowDownCircle className="h-5 w-5 mr-2" />
              Make Deposit
            </Button>
            <Button variant="warning" className="w-full" size="lg">
              <ArrowUpCircle className="h-5 w-5 mr-2" />
              Request Withdrawal
            </Button>
            <Button variant="yahutiOutline" className="w-full" size="lg">
              <TrendingUp className="h-5 w-5 mr-2" />
              View Analytics
            </Button>
          </CardContent>
        </Card>

        <Card variant="yahuti">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Transactions
            </CardTitle>
            <CardDescription>
              Latest vault activity and transfers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {transaction.type === 'deposit' && <ArrowDownCircle className="h-5 w-5 text-green-400" />}
                      {transaction.type === 'withdrawal' && <ArrowUpCircle className="h-5 w-5 text-orange-400" />}
                      {transaction.type === 'trade_profit' && <TrendingUp className="h-5 w-5 text-blue-400" />}
                    </div>
                    <div>
                      <p className="font-semibold text-white">
                        {transaction.type === 'deposit' && 'Deposit'}
                        {transaction.type === 'withdrawal' && 'Withdrawal'}
                        {transaction.type === 'trade_profit' && 'Trade Profit'}
                      </p>
                      <p className="text-sm text-gray-400">{transaction.method}</p>
                      <p className="text-xs text-gray-500">{transaction.reference}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      transaction.type === 'withdrawal' ? 'text-orange-400' : 'text-green-400'
                    }`}>
                      {transaction.type === 'withdrawal' ? '-' : '+'}${transaction.amount}
                    </p>
                    <p className="text-xs text-gray-400">{transaction.timestamp}</p>
                    <StatusBadge 
                      status={transaction.status === 'completed' ? 'active' : 'warning'} 
                      showDot 
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}