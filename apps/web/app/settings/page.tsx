import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, Bell, Shield, User, Database } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-yahuti-gold-500 mb-2">Settings</h1>
          <p className="text-gray-400">System configuration and user preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card variant="yahuti">
          <CardContent className="p-6 text-center">
            <User className="h-12 w-12 text-yahuti-gold-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Profile</h3>
            <p className="text-gray-400 mb-4">Account and personal settings</p>
            <Button variant="yahutiOutline" size="sm">Configure</Button>
          </CardContent>
        </Card>

        <Card variant="yahuti">
          <CardContent className="p-6 text-center">
            <Bell className="h-12 w-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Notifications</h3>
            <p className="text-gray-400 mb-4">Alert preferences and channels</p>
            <Button variant="yahutiOutline" size="sm">Configure</Button>
          </CardContent>
        </Card>

        <Card variant="yahuti">
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Security</h3>
            <p className="text-gray-400 mb-4">Security and authentication</p>
            <Button variant="yahutiOutline" size="sm">Configure</Button>
          </CardContent>
        </Card>
      </div>

      <Card variant="yahuti">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            System Settings
          </CardTitle>
          <CardDescription>Advanced configuration options</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12">
          <p className="text-gray-400 mb-4">Advanced settings panel coming soon</p>
          <Button variant="yahuti">
            <Settings className="h-4 w-4 mr-2" />
            Access Admin Panel
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}