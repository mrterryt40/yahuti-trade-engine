import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import { Brain, Cpu, Zap, Settings, Play, Pause } from 'lucide-react'

export default function BrainsPage() {
  const aiModules = [
    { name: 'Price Predictor', status: 'active', accuracy: '94.2%', lastTrained: '2 hours ago' },
    { name: 'Demand Forecaster', status: 'active', accuracy: '87.8%', lastTrained: '1 day ago' },
    { name: 'Risk Assessor', status: 'warning', accuracy: '91.5%', lastTrained: '3 days ago' },
    { name: 'Market Sentiment', status: 'inactive', accuracy: '89.3%', lastTrained: '1 week ago' }
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-yahuti-gold-500 mb-2">Brains</h1>
          <p className="text-gray-400">AI intelligence modules and neural network management</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="yahutiOutline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configure AI
          </Button>
          <Button variant="yahuti" size="sm">
            <Zap className="h-4 w-4 mr-2" />
            Train Models
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {aiModules.map((module, index) => (
          <Card key={index} variant="yahuti">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Brain className="h-8 w-8 text-yahuti-gold-500" />
                <StatusBadge status={module.status} showDot />
              </div>
              <h3 className="font-bold text-white mb-2">{module.name}</h3>
              <p className="text-sm text-gray-400 mb-2">Accuracy: {module.accuracy}</p>
              <p className="text-xs text-gray-500">Trained: {module.lastTrained}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card variant="yahuti">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            Neural Network Status
          </CardTitle>
          <CardDescription>AI processing and learning capabilities</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12">
          <p className="text-gray-400 mb-4">Advanced AI features coming soon</p>
          <div className="flex justify-center gap-4">
            <Button variant="success">
              <Play className="h-4 w-4 mr-2" />
              Start Training
            </Button>
            <Button variant="warning">
              <Pause className="h-4 w-4 mr-2" />
              Pause AI
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}