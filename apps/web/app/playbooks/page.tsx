import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, Plus, Play, Edit } from 'lucide-react'

export default function PlaybooksPage() {
  const playbooks = [
    { name: 'Electronics Arbitrage', category: 'Tech', status: 'active', trades: 47, success: '94%' },
    { name: 'Sneaker Flipping', category: 'Fashion', status: 'paused', trades: 23, success: '89%' },
    { name: 'Gaming Console Hunt', category: 'Gaming', status: 'active', trades: 31, success: '91%' }
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-yahuti-gold-500 mb-2">Playbooks</h1>
          <p className="text-gray-400">Trading strategies and automated workflows</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="yahutiOutline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Playbook
          </Button>
          <Button variant="yahuti" size="sm">
            <Play className="h-4 w-4 mr-2" />
            Run All
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {playbooks.map((playbook, index) => (
          <Card key={index} variant="yahuti">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <BookOpen className="h-8 w-8 text-yahuti-gold-500" />
                <span className={`text-xs px-2 py-1 rounded ${
                  playbook.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {playbook.status}
                </span>
              </div>
              <h3 className="font-bold text-white mb-2">{playbook.name}</h3>
              <p className="text-sm text-gray-400 mb-4">{playbook.category}</p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Trades: {playbook.trades}</span>
                <span className="text-green-400">Success: {playbook.success}</span>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="yahutiOutline" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="yahuti" size="sm" className="flex-1">
                  <Play className="h-4 w-4 mr-2" />
                  Run
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card variant="yahuti">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Playbook Management
          </CardTitle>
          <CardDescription>Create and manage automated trading strategies</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12">
          <p className="text-gray-400 mb-4">Advanced playbook editor coming soon</p>
          <Button variant="yahuti">
            <Plus className="h-4 w-4 mr-2" />
            Create First Playbook
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}