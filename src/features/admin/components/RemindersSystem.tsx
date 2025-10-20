import { useMemo, useState } from 'react'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { Card } from '../../../components/ui/card'

interface ReminderRule {
  id: string
  type: 'session' | 'check-in' | 'payment' | 'custom'
  trigger: string
  channels: ('in-app' | 'email' | 'sms')[]
  enabled: boolean
  template: string
}

interface ReminderLog {
  id: string
  clientId: string
  clientName: string
  type: ReminderRule['type']
  message: string
  channel: 'in-app' | 'email' | 'sms'
  sentAt: string
  status: 'sent' | 'pending' | 'failed'
  readAt?: string
}

interface RemindersSystemProps {
  className?: string
}

const MOCK_REMINDER_RULES: ReminderRule[] = [
  {
    id: 'rule_001',
    type: 'session',
    trigger: '24h_before',
    channels: ['in-app', 'email'],
    enabled: true,
    template: 'Hi {client_name}, your session tomorrow at {time} is confirmed. See you then!',
  },
  {
    id: 'rule_002',
    type: 'session',
    trigger: '2h_before',
    channels: ['in-app', 'sms'],
    enabled: true,
    template: 'Quick reminder: Training session in 2 hours! {location}',
  },
  {
    id: 'rule_003',
    type: 'check-in',
    trigger: 'weekly_missing',
    channels: ['in-app', 'email'],
    enabled: true,
    template: 'Hi {client_name}, haven\'t seen your weekly check-in yet. How was your week?',
  },
  {
    id: 'rule_004',
    type: 'payment',
    trigger: '7_days_before_due',
    channels: ['in-app', 'email'],
    enabled: false,
    template: 'Your subscription renews in 7 days. Update payment details if needed.',
  },
]

const MOCK_REMINDER_LOGS: ReminderLog[] = [
  {
    id: 'log_001',
    clientId: 'client_001',
    clientName: 'Maya Chen',
    type: 'session',
    message: 'Hi Maya Chen, your session tomorrow at 09:00 is confirmed. See you then!',
    channel: 'email',
    sentAt: '2024-01-14T08:00:00Z',
    status: 'sent',
    readAt: '2024-01-14T09:15:00Z',
  },
  {
    id: 'log_002',
    clientId: 'client_002',
    clientName: 'Jordan Lee',
    type: 'check-in',
    message: 'Hi Jordan Lee, haven\'t seen your weekly check-in yet. How was your week?',
    channel: 'in-app',
    sentAt: '2024-01-14T10:30:00Z',
    status: 'sent',
  },
  {
    id: 'log_003',
    clientId: 'client_003',
    clientName: 'Logan Reyes',
    type: 'session',
    message: 'Quick reminder: Training session in 2 hours! Main Studio',
    channel: 'sms',
    sentAt: '2024-01-14T12:00:00Z',
    status: 'pending',
  },
]

const CHANNEL_COLORS = {
  'in-app': 'bg-blue-100 text-blue-700',
  email: 'bg-green-100 text-green-700',
  sms: 'bg-purple-100 text-purple-700',
}

const STATUS_COLORS = {
  sent: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-700',
}

const TYPE_LABELS = {
  session: 'Session Reminder',
  'check-in': 'Check-in Reminder',
  payment: 'Payment Reminder',
  custom: 'Custom Reminder',
}

export function RemindersSystem({ className }: RemindersSystemProps) {
  const [activeTab, setActiveTab] = useState<'rules' | 'logs'>('rules')
  const [editingRule, setEditingRule] = useState<string | null>(null)

  const filteredLogs = useMemo(() => {
    return MOCK_REMINDER_LOGS.sort((a, b) => 
      new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
    )
  }, [])

  const handleToggleRule = (ruleId: string) => {
    // This would update the rule in the backend
    console.log(`Toggle rule ${ruleId}`)
  }

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date()
    const sent = new Date(timestamp)
    const diff = now.getTime() - sent.getTime()
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 60) return `${minutes} min ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hr ago`
    const days = Math.floor(hours / 24)
    return `${days} day${days > 1 ? 's' : ''} ago`
  }

  const RuleCard = ({ rule }: { rule: ReminderRule }) => (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-semibold text-slate-900">{TYPE_LABELS[rule.type]}</h4>
          <p className="text-sm text-slate-600">{rule.trigger}</p>
        </div>
        <Badge variant={rule.enabled ? 'default' : 'secondary'}>
          {rule.enabled ? 'Enabled' : 'Disabled'}
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="text-sm">
          <span className="font-medium text-slate-700">Channels: </span>
          <div className="flex gap-1 mt-1">
            {rule.channels.map((channel) => (
              <Badge key={channel} className={CHANNEL_COLORS[channel]} variant="secondary">
                {channel}
              </Badge>
            ))}
          </div>
        </div>
        
        <div className="text-sm">
          <span className="font-medium text-slate-700">Template: </span>
          <p className="text-slate-600 mt-1 p-2 bg-slate-50 rounded text-xs">{rule.template}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setEditingRule(editingRule === rule.id ? null : rule.id)}
        >
          {editingRule === rule.id ? 'Cancel' : 'Edit'}
        </Button>
        <Button
          size="sm"
          variant={rule.enabled ? 'destructive' : 'default'}
          onClick={() => handleToggleRule(rule.id)}
        >
          {rule.enabled ? 'Disable' : 'Enable'}
        </Button>
      </div>
    </Card>
  )

  const LogCard = ({ log }: { log: ReminderLog }) => (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-semibold text-slate-900">{log.clientName}</h4>
          <p className="text-sm text-slate-600">{TYPE_LABELS[log.type]}</p>
          <p className="text-xs text-slate-500 mt-1">{formatRelativeTime(log.sentAt)}</p>
        </div>
        <div className="flex gap-2">
          <Badge className={CHANNEL_COLORS[log.channel]} variant="secondary">
            {log.channel}
          </Badge>
          <Badge className={STATUS_COLORS[log.status]} variant="secondary">
            {log.status}
          </Badge>
        </div>
      </div>

      <div className="text-sm">
        <p className="text-slate-700 p-2 bg-slate-50 rounded">{log.message}</p>
        {log.readAt && (
          <p className="text-xs text-slate-500 mt-1">Read {formatRelativeTime(log.readAt)}</p>
        )}
      </div>
    </Card>
  )

  return (
    <div className={`space-y-6 ${className || ''}`}>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Automated Reminders</h2>
          <p className="text-sm text-slate-600">Manage notification rules and communication history</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'rules' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('rules')}
          >
            Rules
          </Button>
          <Button
            variant={activeTab === 'logs' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('logs')}
          >
            Logs
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Rule
          </Button>
          <Button size="sm" variant="outline">
            Send Manual Reminder
          </Button>
        </div>

        <div className="text-sm text-slate-600">
          <span className="font-medium">{filteredLogs.filter(l => l.status === 'pending').length}</span> pending • 
          <span className="font-medium"> {filteredLogs.filter(l => l.status === 'sent').length}</span> sent today
        </div>
      </div>

      {activeTab === 'rules' && (
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Reminder Rules</h3>
          {MOCK_REMINDER_RULES.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-300 rounded-lg bg-slate-50">
              <svg className="w-12 h-12 mx-auto text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No reminder rules</h3>
              <p className="text-sm text-slate-600">Create your first automated reminder rule</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {MOCK_REMINDER_RULES.map((rule) => (
                <RuleCard key={rule.id} rule={rule} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'logs' && (
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Communication History</h3>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-300 rounded-lg bg-slate-50">
              <svg className="w-12 h-12 mx-auto text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No communication history</h3>
              <p className="text-sm text-slate-600">Reminder logs will appear here once sent</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map((log) => (
                <LogCard key={log.id} log={log} />
              ))}
            </div>
          )}
        </div>
      )}

      <section className="mt-8">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="p-4">
            <h4 className="font-medium text-slate-900 mb-2">Send Session Reminder</h4>
            <p className="text-sm text-slate-600 mb-3">Manually trigger session reminders</p>
            <Button size="sm" variant="outline" className="w-full">
              Send Now
            </Button>
          </Card>
          
          <Card className="p-4">
            <h4 className="font-medium text-slate-900 mb-2">Check-in Follow-up</h4>
            <p className="text-sm text-slate-600 mb-3">Follow up on missed check-ins</p>
            <Button size="sm" variant="outline" className="w-full">
              View Missed
            </Button>
          </Card>
          
          <Card className="p-4">
            <h4 className="font-medium text-slate-900 mb-2">Payment Notices</h4>
            <p className="text-sm text-slate-600 mb-3">Send upcoming payment reminders</p>
            <Button size="sm" variant="outline" className="w-full">
              Send Notices
            </Button>
          </Card>
        </div>
      </section>
    </div>
  )
}
