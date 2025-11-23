import { useMemo, useState } from 'react'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { Input } from '../../../components/ui/input'
import { Textarea } from '../../../components/ui/textarea'

interface Message {
  id: string
  clientId: string
  authorId: string
  authorType: 'coach' | 'client'
  body: string
  messageType: 'text' | 'system' | 'note'
  sentAt: string
  readAt?: string
}

interface MessageThread {
  clientId: string
  clientName: string
  lastMessage: Message
  unreadCount: number
  messages: Message[]
  status: 'active' | 'archived'
}

interface ClientMessagingProps {
  className?: string
}

const MOCK_THREADS: MessageThread[] = []

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  archived: 'bg-gray-100 text-gray-700',
}

export function ClientMessaging({ className }: ClientMessagingProps) {
  const [selectedThread, setSelectedThread] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)

  const filteredThreads = useMemo(() => {
    let filtered = MOCK_THREADS.filter((thread) => thread.status === 'active')
    
    if (searchTerm) {
      filtered = filtered.filter((thread) =>
        thread.clientName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    if (showUnreadOnly) {
      filtered = filtered.filter((thread) => thread.unreadCount > 0)
    }
    
    return filtered
  }, [searchTerm, showUnreadOnly])

  const totalUnreadCount = useMemo(() => {
    return MOCK_THREADS.reduce((sum, thread) => sum + thread.unreadCount, 0)
  }, [])

  const activeThread = useMemo(() => {
    if (!selectedThread) return null
    return MOCK_THREADS.find((thread) => thread.clientId === selectedThread) ?? null
  }, [selectedThread])

  const handleSendMessage = () => {
    if (!message.trim()) return
    console.log('Sending message:', message.trim())
    setMessage('')
  }

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

  const MessageBubble = ({ message, isCoach }: { message: Message; isCoach: boolean }) => (
    <div className={`flex ${isCoach ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs lg:max-w-md ${isCoach ? 'order-2' : 'order-1'}`}>
        <div className={`rounded-lg p-3 border ${
          isCoach ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white'
        }`}>
          <p className={`text-sm ${isCoach ? 'text-white' : 'text-slate-900'}`}>{message.body}</p>
        </div>
        <div className={`text-xs text-slate-500 mt-1 ${isCoach ? 'text-right' : 'text-left'}`}>
          {formatRelativeTime(message.sentAt)}
          {message.readAt && isCoach && ' • Read'}
        </div>
      </div>
    </div>
  )

  if (activeThread) {
    return (
      <div className={`h-[600px] flex flex-col ${className ?? ''}`}>
        <header className="flex items-center gap-4 p-4 border-b border-slate-200 bg-white">
          <Button size="sm" variant="outline" onClick={() => setSelectedThread(null)}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900">{activeThread.clientName}</h3>
            <p className="text-xs text-slate-600">
              {activeThread.status === 'active' ? 'Active conversation' : 'Archived conversation'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`px-2 py-1 text-xs ${STATUS_COLORS[activeThread.status]}`}>
              {activeThread.status === 'active' ? 'Active' : 'Archived'}
            </Badge>
            {activeThread.unreadCount > 0 ? (
              <Badge className="bg-indigo-600 text-white px-2 py-1 text-xs">{activeThread.unreadCount}</Badge>
            ) : null}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
          {activeThread.messages.length ? (
            activeThread.messages.map((entry) => (
              <MessageBubble key={entry.id} message={entry} isCoach={entry.authorType === 'coach'} />
            ))
          ) : (
            <div className="text-center py-8">
              <svg className="w-12 h-12 mx-auto text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No messages yet</h3>
              <p className="text-sm text-slate-600">Start the conversation to keep clients engaged.</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 bg-white">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              handleSendMessage()
            }}
          >
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Type your message..."
              className="flex-1 min-h-[40px] max-h-[120px] resize-none"
              rows={1}
            />
            <Button type="submit" disabled={!message.trim()} className="bg-indigo-600 hover:bg-indigo-700">
              Send
            </Button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className={`h-[600px] flex flex-col ${className ?? ''}`}>
      <header className="p-4 border-b border-slate-200 bg-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Client Messages</h2>
            <p className="text-sm text-slate-600">
              {filteredThreads.length} conversation{filteredThreads.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New Message
            </Button>
            {totalUnreadCount > 0 ? (
              <Badge className="bg-indigo-50 text-indigo-600 px-2 py-1 text-xs">
                {totalUnreadCount} unread
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-4 sm:flex-row">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search conversations..."
              className="pl-10"
            />
          </div>
          
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={showUnreadOnly}
              onChange={(e) => setShowUnreadOnly(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Unread only
          </label>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {filteredThreads.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-12 h-12 mx-auto text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No conversations</h3>
            <p className="text-sm text-slate-600">Messaging functionality will be available once clients are added</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredThreads.map((thread) => (
              <div
                key={thread.clientId}
                onClick={() => setSelectedThread(thread.clientId)}
                className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold">
                    {thread.clientName.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-slate-900 truncate">
                        {thread.clientName}
                      </h3>
                      <span className="text-xs text-slate-500">
                        {formatRelativeTime(thread.lastMessage.sentAt)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-600 truncate mb-2">
                      {thread.lastMessage.authorType === 'coach' ? 'You: ' : ''}
                      {thread.lastMessage.body}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {thread.unreadCount > 0 && (
                          <Badge className="bg-indigo-600 text-white px-2 py-1 text-xs">
                            {thread.unreadCount}
                          </Badge>
                        )}
                        <span className="text-xs text-slate-500">
                          {thread.lastMessage.authorType === 'coach' ? 'Coach' : 'Client'}
                        </span>
                      </div>
                      <Badge className={`px-2 py-1 text-xs ${STATUS_COLORS[thread.status]}`}>
                        {thread.status === 'active' ? 'Active' : 'Archived'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
