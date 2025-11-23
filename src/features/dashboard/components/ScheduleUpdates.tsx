import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'

interface ScheduleUpdate {
  id: string
  date: string
  time: string
  sessionType: string
  status: 'confirmed' | 'rescheduled' | 'cancelled'
  previousTime?: string
  trainerNote?: string
}

interface ScheduleUpdatesProps {
  className?: string
}

const MOCK_SCHEDULE_UPDATES: ScheduleUpdate[] = [
  {
    id: 'update_001',
    date: '2024-01-15',
    time: '09:00',
    sessionType: 'Upper Body Strength',
    status: 'confirmed',
    trainerNote: 'Focus on shoulder mobility today',
  },
  {
    id: 'update_002', 
    date: '2024-01-16',
    time: '14:00',
    sessionType: 'Lower Body Power',
    status: 'rescheduled',
    previousTime: '10:00',
    trainerNote: 'Client requested afternoon slot',
  },
  {
    id: 'update_003',
    date: '2024-01-17',
    time: '16:30',
    sessionType: 'Core & Stability',
    status: 'confirmed',
  },
]

const STATUS_CONFIG = {
  confirmed: {
    label: 'Confirmed',
    color: 'bg-green-100 text-green-700',
    icon: '✅',
  },
  rescheduled: {
    label: 'Rescheduled',
    color: 'bg-blue-100 text-blue-700',
    icon: '🔄',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-700',
    icon: '❌',
  },
}

export function ScheduleUpdates({ className }: ScheduleUpdatesProps) {

  const upcomingSchedule = useMemo(() => {
    // Filter for future sessions
    const now = new Date()
    const upcoming = MOCK_SCHEDULE_UPDATES.filter(update => {
      const sessionDate = new Date(update.date)
      return sessionDate >= now
    })

    // Sort by date and time
    return upcoming.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date)
      if (dateCompare !== 0) return dateCompare
      return a.time.localeCompare(b.time)
    }).slice(0, 3) // Show next 3 sessions
  }, [])

  const getStatusMessage = (update: ScheduleUpdate) => {
    switch (update.status) {
      case 'confirmed':
        return `Your ${update.sessionType} session is confirmed for ${update.time}`
      case 'rescheduled':
        return `Session rescheduled from ${update.previousTime} to ${update.time}`
      case 'cancelled':
        return `Your ${update.sessionType} session has been cancelled`
      default:
        return update.sessionType
    }
  }

  const formatSessionDate = (date: string) => {
    const sessionDate = new Date(date)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (sessionDate.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (sessionDate.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow'
    } else {
      return sessionDate.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      })
    }
  }

  if (upcomingSchedule.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Schedule Updates</CardTitle>
          <p className="text-sm text-neutral-300/80">Your upcoming training sessions.</p>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="text-muted-foreground text-sm">
              No upcoming sessions scheduled
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          Schedule Updates
          {upcomingSchedule.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {upcomingSchedule.length} upcoming
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-neutral-300/80">Your latest schedule changes and upcoming sessions.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcomingSchedule.map((update) => {
          const config = STATUS_CONFIG[update.status]
          return (
            <div
              key={update.id}
              className="rounded-2xl border border-neutral-200 bg-white p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{config.icon}</span>
                    <span className="font-medium text-slate-900">
                      {update.sessionType}
                    </span>
                    <Badge className={`px-2 py-0.5 text-xs ${config.color}`}>
                      {config.label}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-slate-600">
                    <div className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{formatSessionDate(update.date)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{update.time}</span>
                    </div>
                  </div>

                  <p className="text-slate-700 text-xs">
                    {getStatusMessage(update)}
                  </p>

                  {update.trainerNote && (
                    <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-xs text-slate-600">
                        <span className="font-medium">Coach note:</span> {update.trainerNote}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        <div className="flex justify-center pt-2">
          <button className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
            View full schedule →
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
