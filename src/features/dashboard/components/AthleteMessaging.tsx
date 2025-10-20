import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { useAuthContext } from '../../../context/AuthContext'

interface Message {
  id: string
  author: 'client' | 'coach'
  body: string
  timestamp: string
  readAt?: string
}

interface AthleteMessagingProps {
  className?: string
}

const MOCK_MESSAGES: Message[] = [
  {
    id: 'msg_001',
    author: 'coach',
    body: 'Great work on the deadlifts today! Your form is improving.',
    timestamp: '2024-01-14T16:45:00Z',
    readAt: '2024-01-14T17:30:00Z',
  },
  {
    id: 'msg_002',
    author: 'coach',
    body: 'Remember to focus on form over weight during the first week.',
    timestamp: '2024-01-13T09:20:00Z',
  },
  {
    id: 'msg_003',
    author: 'client',
    body: 'Thanks for the workout plan! Looking forward to starting tomorrow.',
    timestamp: '2024-01-12T10:30:00Z',
    readAt: '2024-01-12T11:00:00Z',
  },
]

export function AthleteMessaging({ className }: AthleteMessagingProps) {
  const { user } = useAuthContext()
  const [message, setMessage] = useState('')

  const messages = useMemo(() => {
    // Sort by timestamp (newest first)
    return [...MOCK_MESSAGES].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }, [])

  const unreadCount = useMemo(() => {
    return messages.filter(msg => !msg.readAt).length
  }, [messages])

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date()
    const sent = new Date(timestamp)
    const diff = now.getTime() - sent.getTime()
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const handleSendMessage = () => {
    if (!message.trim()) return
    
    // In a real app, this would send to the backend
    console.log('Sending message:', message.trim())
    setMessage('')
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          Coach Messages
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount} unread
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-neutral-300/80">Direct communication with your coach.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-h-48 space-y-3 overflow-y-auto">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.author === 'client' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs rounded-2xl px-3 py-2 text-sm ${
                  msg.author === 'client'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-900 border border-slate-200'
                } ${!msg.readAt && msg.author === 'coach' ? 'ring-2 ring-indigo-200' : ''}`}
              >
                <p className={msg.author === 'client' ? 'text-white' : 'text-slate-900'}>
                  {msg.body}
                </p>
                <div className={`text-xs mt-1 ${
                  msg.author === 'client' ? 'text-indigo-100' : 'text-slate-500'
                }`}>
                  {formatRelativeTime(msg.timestamp)}
                  {msg.author === 'coach' && !msg.readAt && ' • Unread'}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-3">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            className="flex gap-2"
          >
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message to your coach..."
              className="flex-1 text-sm"
              autoComplete="off"
            />
            <Button 
              type="submit"
              size="sm"
              disabled={!message.trim()}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Send
            </Button>
          </form>
        </div>

        <div className="text-center">
          <button className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
            Open full conversation →
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
