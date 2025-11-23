import { useMemo, useState } from 'react'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { Card } from '../../../components/ui/card'

interface ScheduledSession {
  id: string
  clientId: string
  clientName: string
  date: string
  time: string
  duration: number // minutes
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show'
  sessionType: string
  notes?: string
}

interface SchedulingConsoleProps {
  onSessionAction?: (sessionId: string, action: 'confirm' | 'reschedule' | 'cancel') => void
  className?: string
}

const SESSION_STATUS_COLORS = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  'no-show': 'bg-orange-100 text-orange-700',
}

const MOCK_SESSIONS: ScheduledSession[] = [
  {
    id: 'session_001',
    clientId: 'client_001',
    clientName: 'Maya Chen',
    date: '2024-01-15',
    time: '09:00',
    duration: 60,
    status: 'scheduled',
    sessionType: 'Upper Body Strength',
    notes: 'Focus on shoulder mobility',
  },
  {
    id: 'session_002',
    clientId: 'client_002',
    clientName: 'Jordan Lee',
    date: '2024-01-15',
    time: '10:30',
    duration: 45,
    status: 'completed',
    sessionType: 'Lower Body Power',
  },
  {
    id: 'session_003',
    clientName: 'Logan Reyes',
    date: '2024-01-15',
    clientId: 'client_003',
    time: '14:00',
    duration: 60,
    status: 'scheduled',
    sessionType: 'Core & Stability',
    notes: 'Progressive ab workout',
  },
  {
    id: 'session_004',
    clientId: 'client_004',
    clientName: 'Priya Patel',
    date: '2024-01-16',
    time: '08:00',
    duration: 75,
    status: 'cancelled',
    sessionType: 'Full Body Conditioning',
    notes: 'Client requested reschedule',
  },
]

export function SchedulingConsole({ onSessionAction, className }: SchedulingConsoleProps) {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  const filteredSessions = useMemo(() => {
    return MOCK_SESSIONS.filter((session) => session.date === selectedDate)
  }, [selectedDate])

  const calendarDays = useMemo(() => {
    const today = new Date()
    const days = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      days.push({
        date: date.toISOString().split('T')[0],
        dayName: date.toLocaleDateString('en', { weekday: 'short' }),
        dayNumber: date.getDate(),
        sessions: MOCK_SESSIONS.filter((session) => session.date === date.toISOString().split('T')[0]),
      })
    }
    return days
  }, [])

  const handleSessionAction = (sessionId: string, action: 'confirm' | 'reschedule' | 'cancel') => {
    onSessionAction?.(sessionId, action)
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`
  }

  const SessionCard = ({ session }: { session: ScheduledSession }) => (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-semibold text-slate-900">{session.clientName}</h4>
          <p className="text-sm text-slate-600">{session.sessionType}</p>
          {session.notes && <p className="text-xs text-slate-500 mt-1">{session.notes}</p>}
        </div>
        <Badge className={SESSION_STATUS_COLORS[session.status]}>
          {session.status}
        </Badge>
      </div>
      
      <div className="flex items-center gap-4 text-sm text-slate-600">
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {session.time}
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {formatDuration(session.duration)}
        </span>
      </div>

      {session.status === 'scheduled' && (
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSessionAction(session.id, 'confirm')}
          >
            Confirm
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSessionAction(session.id, 'reschedule')}
          >
            Reschedule
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSessionAction(session.id, 'cancel')}
            className="text-red-600 hover:text-red-700"
          >
            Cancel
          </Button>
        </div>
      )}
    </Card>
  )

  const viewSwitchControls = (
    <div className="flex gap-2">
      <Button
        variant={viewMode === 'list' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setViewMode('list')}
      >
        List View
      </Button>
      <Button
        variant={viewMode === 'calendar' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setViewMode('calendar')}
      >
        Calendar View
      </Button>
    </div>
  )

  if (viewMode === 'calendar') {
    return (
      <div className={`space-y-6 ${className || ''}`}>
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Scheduling Console</h2>
            <p className="text-sm text-slate-600">Manage client sessions with calendar view</p>
          </div>
          {viewSwitchControls}
        </header>

        <div className="grid gap-4 md:grid-cols-7">
          {calendarDays.map((day) => (
            <div key={day.date} className="border border-slate-200 rounded-lg p-3">
              <div className="text-center mb-3">
                <div className="text-xs text-slate-500">{day.dayName}</div>
                <div className="text-lg font-semibold text-slate-900">{day.dayNumber}</div>
                {day.sessions.length > 0 && (
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {day.sessions.length} session{day.sessions.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              
              <div className="space-y-2">
                {day.sessions.slice(0, 2).map((session) => (
                  <div key={session.id} className="text-xs p-2 bg-slate-50 rounded">
                    <div className="font-medium text-slate-900 truncate">{session.time}</div>
                    <div className="text-slate-600 truncate">{session.clientName}</div>
                  </div>
                ))}
                {day.sessions.length > 2 && (
                  <div className="text-xs text-slate-500 text-center">
                    +{day.sessions.length - 2} more
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className || ''}`}>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Scheduling Console</h2>
          <p className="text-sm text-slate-600">Manage and track client sessions</p>
        </div>
        {viewSwitchControls}
      </header>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <span>Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </label>
          <Badge variant="secondary">
            {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        
        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Session
        </Button>
      </div>

      {filteredSessions.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-300 rounded-lg bg-slate-50">
          <svg className="w-12 h-12 mx-auto text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No sessions scheduled</h3>
          <p className="text-sm text-slate-600">No sessions found for {selectedDate}</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filteredSessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}

      <section className="mt-8">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Session Statistics</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <div className="text-2xl font-bold text-slate-900">{MOCK_SESSIONS.filter(s => s.status === 'scheduled').length}</div>
            <div className="text-sm text-slate-600">Scheduled</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-green-600">{MOCK_SESSIONS.filter(s => s.status === 'completed').length}</div>
            <div className="text-sm text-slate-600">Completed</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-orange-600">{MOCK_SESSIONS.filter(s => s.status === 'no-show').length}</div>
            <div className="text-sm text-slate-600">No-shows</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-red-600">{MOCK_SESSIONS.filter(s => s.status === 'cancelled').length}</div>
            <div className="text-sm text-slate-600">Cancelled</div>
          </Card>
        </div>
      </section>
    </div>
  )
}
