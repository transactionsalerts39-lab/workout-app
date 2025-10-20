import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { useProgressContext } from '../../../context/ProgressContext'

interface ComplianceDashboardProps {
  className?: string
}

const STATUS_CONFIG = {
  'on-track': {
    label: 'On Track',
    color: 'bg-green-100 text-green-700',
    icon: '✅',
  },
  'behind': {
    label: 'Behind', 
    color: 'bg-yellow-100 text-yellow-700',
    icon: '⚠️',
  },
  'critical': {
    label: 'Critical',
    color: 'bg-red-100 text-red-700',
    icon: '🚨',
  },
}

export function ComplianceDashboard({ className }: ComplianceDashboardProps) {
  const { checkInCompliance } = useProgressContext()

  const metrics = useMemo(() => {
    if (!checkInCompliance.length) {
      return {
        totalClients: 0,
        onTrackCount: 0,
        behindCount: 0,
        criticalCount: 0,
        averageCompliance: 0,
        totalMissed: 0,
        currentStreakLeaders: [],
      }
    }

    const totalClients = checkInCompliance.length
    const onTrackCount = checkInCompliance.filter(c => c.status === 'on-track').length
    const behindCount = checkInCompliance.filter(c => c.status === 'behind').length
    const criticalCount = checkInCompliance.filter(c => c.status === 'critical').length
    const averageCompliance = checkInCompliance.reduce((sum, c) => sum + c.complianceRate, 0) / totalClients
    const totalMissed = checkInCompliance.reduce((sum, c) => sum + c.missed, 0)

    // Get streak leaders (top 3)
    const streakLeaders = [...checkInCompliance]
      .sort((a, b) => b.currentStreak - a.currentStreak)
      .slice(0, 3)
      .filter(c => c.currentStreak > 0)

    return {
      totalClients,
      onTrackCount,
      behindCount,
      criticalCount,
      averageCompliance,
      totalMissed,
      currentStreakLeaders: streakLeaders,
    }
  }, [checkInCompliance])

  const formatComplianceRate = (rate: number) => `${Math.round(rate)}%`

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const sortedCompliance = useMemo(() => {
    return [...checkInCompliance].sort((a, b) => {
      // Sort by status priority (critical first), then by compliance rate
      const priorityOrder = { critical: 0, behind: 1, 'on-track': 2 }
      const aPriority = priorityOrder[a.status] 
      const bPriority = priorityOrder[b.status]
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority
      }
      
      return b.complianceRate - a.complianceRate
    })
  }, [checkInCompliance])

  if (!checkInCompliance.length) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">Check-in Compliance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-muted-foreground text-sm">
              No client data available for compliance tracking
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          Check-in Compliance Dashboard
          <Badge variant="secondary" className="text-xs">
            {metrics.totalClients} clients
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {formatComplianceRate(metrics.averageCompliance)}
            </div>
            <div className="text-xs text-gray-600">Average Compliance</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {metrics.behindCount}
            </div>
            <div className="text-xs text-gray-600">Behind Schedule</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {metrics.criticalCount}
            </div>
            <div className="text-xs text-gray-600">Critical Cases</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {metrics.totalMissed}
            </div>
            <div className="text-xs text-gray-600">Total Missed</div>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Status Distribution</h3>
          <div className="grid gap-2 md:grid-cols-3">
            {(['on-track', 'behind', 'critical'] as const).map((status) => {
              const config = STATUS_CONFIG[status]
              const count = status === 'on-track' ? metrics.onTrackCount : 
                           status === 'behind' ? metrics.behindCount : 
                           metrics.criticalCount
              const percentage = metrics.totalClients > 0 ? (count / metrics.totalClients) * 100 : 0
              
              return (
                <div key={status} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{config.icon}</span>
                    <span className="text-sm font-medium">{config.label}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{count}</div>
                    <div className="text-xs text-gray-500">{formatComplianceRate(percentage)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Streak Leaders */}
        {metrics.currentStreakLeaders.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Current Streak Leaders 🔥</h3>
            <div className="grid gap-2 md:grid-cols-3">
              {metrics.currentStreakLeaders.map((client) => (
                <div key={client.clientId} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gradient-to-r from-yellow-50 to-orange-50">
                  <div>
                    <div className="text-sm font-medium">{client.clientName}</div>
                    <div className="text-xs text-gray-600">Week {client.currentStreak} streak</div>
                  </div>
                  <div className="text-lg font-semibold text-orange-600">
                    {client.currentStreak}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Client List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Client Details</h3>
            <Button size="sm" variant="outline">
              Export Report
            </Button>
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {sortedCompliance.map((client) => {
              const config = STATUS_CONFIG[client.status]
              
              return (
                <div
                  key={client.clientId}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{client.clientName}</span>
                      <Badge className={`${config.color} text-xs`}>
                        <span className="mr-1">{config.icon}</span>
                        {config.label}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                      <span>{formatComplianceRate(client.complianceRate)} compliance</span>
                      <span>{client.completedOnTime + client.completedLate} completed</span>
                      {client.missed > 0 && (
                        <span className="text-red-600">{client.missed} missed</span>
                      )}
                      {client.currentStreak > 0 && (
                        <span className="text-orange-600">🔥 {client.currentStreak} streak</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      {formatComplianceRate(client.complianceRate)}
                    </div>
                    {client.nextCheckInDue && (
                      <div className="text-xs text-gray-500">
                        Due: {formatDate(client.nextCheckInDue)}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="border-t pt-4">
          <div className="grid gap-2 md:grid-cols-3">
            <Button size="sm" variant="outline" className="w-full">
              Send Reminder to All Behind
            </Button>
            <Button size="sm" variant="outline" className="w-full">
              Follow Up Critical Cases
            </Button>
            <Button size="sm" className="w-full">
              Generate Compliance Report
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
