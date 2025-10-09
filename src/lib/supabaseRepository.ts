import { SupabaseClient, createClient } from '@supabase/supabase-js'
import type {
  ClientProfile,
  ClientCheckIn,
  ProgressPhoto,
  PaymentRecord,
  SubscriptionProduct,
  ChallengeProgram,
  WorkoutTemplate,
  ClientProfileSettings,
} from '../types/program'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          display_name: string
          email: string
          is_admin: boolean
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          display_name: string
          email: string
          is_admin?: boolean
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          display_name?: string
          email?: string
          is_admin?: boolean
          timezone?: string
          created_at?: string
          updated_at?: string
        }
      }
      client_profiles: {
        Row: {
          id: string
          user_id: string
          name: string
          email: string
          goal: string | null
          plan_start_date: string | null
          plan_end_date: string | null
          assigned_template_id: string | null
          active_challenge_id: string | null
          adherence_rate: number
          completed_sessions: number
          total_sessions: number
          last_check_in_at: string | null
          preferred_name: string | null
          birth_date: string | null
          age: number | null
          health_notes: string | null
          emergency_contact: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          email: string
          goal?: string | null
          plan_start_date?: string | null
          plan_end_date?: string | null
          assigned_template_id?: string | null
          active_challenge_id?: string | null
          adherence_rate?: number
          completed_sessions?: number
          total_sessions?: number
          last_check_in_at?: string | null
          preferred_name?: string | null
          birth_date?: string | null
          age?: number | null
          health_notes?: string | null
          emergency_contact?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          email?: string
          goal?: string | null
          plan_start_date?: string | null
          plan_end_date?: string | null
          assigned_template_id?: string | null
          active_challenge_id?: string | null
          adherence_rate?: number
          completed_sessions?: number
          total_sessions?: number
          last_check_in_at?: string | null
          preferred_name?: string | null
          birth_date?: string | null
          age?: number | null
          health_notes?: string | null
          emergency_contact?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      session_progress: {
        Row: {
          id: string
          user_id: string
          client_id: string | null
          week_index: number
          session_id: string
          exercise_id: string
          completed_sets: number
          total_sets: number
          set_entries: any
          notes: string | null
          completed_at: string | null
          celebration_emoji: string | null
          points_earned: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          client_id?: string | null
          week_index: number
          session_id: string
          exercise_id: string
          completed_sets?: number
          total_sets: number
          set_entries?: any
          notes?: string | null
          completed_at?: string | null
          celebration_emoji?: string | null
          points_earned?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          client_id?: string | null
          week_index?: number
          session_id?: string
          exercise_id?: string
          completed_sets?: number
          total_sets?: number
          set_entries?: any
          notes?: string | null
          completed_at?: string | null
          celebration_emoji?: string | null
          points_earned?: number
          created_at?: string
          updated_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          client_id: string
          author_type: 'coach' | 'client'
          author_id: string
          message_body: string
          sent_at: string
          read_at: string | null
          message_type: string
        }
        Insert: {
          id?: string
          client_id: string
          author_type: 'coach' | 'client'
          author_id: string
          message_body: string
          sent_at?: string
          read_at?: string | null
          message_type?: string
        }
        Update: {
          id?: string
          client_id?: string
          author_type?: 'coach' | 'client'
          author_id?: string
          message_body?: string
          sent_at?: string
          read_at?: string | null
          message_type?: string
        }
      }
      notifications: {
        Row: {
          id: string
          client_id: string
          title: string
          message: string
          tone: 'success' | 'warning' | 'error' | 'info'
          read_at: string | null
          action_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          title: string
          message: string
          tone?: 'success' | 'warning' | 'error' | 'info'
          read_at?: string | null
          action_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          title?: string
          message?: string
          tone?: 'success' | 'warning' | 'error' | 'info'
          read_at?: string | null
          action_url?: string | null
          created_at?: string
        }
      }
      client_check_ins: {
        Row: {
          id: string
          client_id: string
          week_index: number
          submitted_at: string
          energy_level: number
          stress_level: number
          weight_kg: number | null
          notes: string | null
          attachments: string[]
        }
        Insert: {
          id?: string
          client_id: string
          week_index: number
          submitted_at?: string
          energy_level: number
          stress_level: number
          weight_kg?: number | null
          notes?: string | null
          attachments?: string[]
        }
        Update: {
          id?: string
          client_id?: string
          week_index?: number
          submitted_at?: string
          energy_level?: number
          stress_level?: number
          weight_kg?: number | null
          notes?: string | null
          attachments?: string[]
        }
      }
      progress_photos: {
        Row: {
          id: string
          client_id: string
          label: string
          uploaded_at: string
          image_url: string
          content_type: string | null
          size_bytes: number | null
        }
        Insert: {
          id?: string
          client_id: string
          label: string
          uploaded_at?: string
          image_url: string
          content_type?: string | null
          size_bytes?: number | null
        }
        Update: {
          id?: string
          client_id?: string
          label?: string
          uploaded_at?: string
          image_url?: string
          content_type?: string | null
          size_bytes?: number | null
        }
      }
      payment_records: {
        Row: {
          id: string
          client_id: string
          type: 'subscription' | 'renewal' | 'challenge'
          amount: number
          currency: 'INR' | 'USD'
          status: 'paid' | 'due' | 'failed'
          recorded_at: string
          description: string | null
          invoice_url: string | null
        }
        Insert: {
          id?: string
          client_id: string
          type: 'subscription' | 'renewal' | 'challenge'
          amount: number
          currency: 'INR' | 'USD'
          status?: 'paid' | 'due' | 'failed'
          recorded_at?: string
          description?: string | null
          invoice_url?: string | null
        }
        Update: {
          id?: string
          client_id?: string
          type?: 'subscription' | 'renewal' | 'challenge'
          amount?: number
          currency?: 'INR' | 'USD'
          status?: 'paid' | 'due' | 'failed'
          recorded_at?: string
          description?: string | null
          invoice_url?: string | null
        }
      }
    }
  }
}

export class SupabaseRepository {
  private supabase: SupabaseClient<Database>

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  }

  // Auth methods
  async signUp(email: string, password: string, userData: { display_name: string; username?: string }) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
    })

    if (error) throw error

    if (data.user) {
      // Create profile
      const { error: profileError } = await this.supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email,
          display_name: userData.display_name,
          username: userData.username || null,
          is_admin: false,
        })

      if (profileError) throw profileError
    }

    return data
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    return data
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut()
    if (error) throw error
  }

  async getCurrentUser() {
    const { data: { user } } = await this.supabase.auth.getUser()
    return user
  }

  async getProfile(userId: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error
    return data
  }

  // Client management methods
  async getAllClientProfiles(): Promise<ClientProfile[]> {
    const { data, error } = await this.supabase
      .from('client_profiles')
      .select(`
        *,
        client_check_ins(*),
        progress_photos(*),
        payment_records(*)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    return data.map(this.mapClientProfile)
  }

  async getClientProfile(userId: string): Promise<ClientProfile | null> {
    const { data, error } = await this.supabase
      .from('client_profiles')
      .select(`
        *,
        client_check_ins(*),
        progress_photos(*),
        payment_records(*)
      `)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }

    return this.mapClientProfile(data)
  }

  async updateClientSettings(clientId: string, settings: Partial<ClientProfileSettings>) {
    const { data, error } = await this.supabase
      .from('client_profiles')
      .update({
        preferred_name: settings.preferredName,
        birth_date: settings.birthDate,
        age: settings.age,
        health_notes: settings.healthNotes,
        emergency_contact: settings.emergencyContact,
        updated_at: new Date().toISOString(),
      })
      .eq('id', clientId)
      .select('*')
      .single()

    if (error) throw error
    return data
  }

  // Session progress methods
  async getUserProgress(userId: string) {
    const { data, error } = await this.supabase
      .from('session_progress')
      .select('*')
      .eq('user_id', userId)
      .order('week_index', { ascending: true })

    if (error) throw error
    return data
  }

  async markExerciseComplete(
    userId: string,
    weekIndex: number,
    sessionId: string,
    exerciseId: string,
    completedSets: number,
    totalSets: number,
    celebrationEmoji?: string
  ) {
    const { data, error } = await this.supabase
      .from('session_progress')
      .upsert(
        {
          user_id: userId,
          week_index: weekIndex,
          session_id: sessionId,
          exercise_id: exerciseId,
          completed_sets: completedSets,
          total_sets: totalSets,
          completed_at: new Date().toISOString(),
          celebration_emoji: celebrationEmoji || null,
          points_earned: completedSets === totalSets ? 100 : (completedSets / totalSets) * 100,
        },
        { onConflict: 'user_id,week_index,session_id,exercise_id' }
      )
      .select('*')
      .single()

    if (error) throw error
    return data
  }

  // Chat methods
  async getChatMessages(clientId: string, limit: number = 50) {
    const { data, error } = await this.supabase
      .from('chat_messages')
      .select(`
        *,
        profiles!chat_messages_author_id_fkey(display_name)
      `)
      .eq('client_id', clientId)
      .order('sent_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data.reverse() // Return in chronological order
  }

  async sendChatMessage(
    clientId: string,
    authorId: string,
    authorType: 'coach' | 'client',
    messageBody: string,
    messageType: string = 'text'
  ) {
    const { data, error } = await this.supabase
      .from('chat_messages')
      .insert({
        client_id: clientId,
        author_id: authorId,
        author_type: authorType,
        message_body: messageBody,
        message_type: messageType,
      })
      .select('*')
      .single()

    if (error) throw error
    return data
  }

  // Notification methods
  async getNotifications(clientId: string, unreadOnly: boolean = false) {
    let query = this.supabase
      .from('notifications')
      .select('*')
      .eq('client_id', clientId)

    if (unreadOnly) {
      query = query.is('read_at', null)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async markNotificationAsRead(notificationId: string) {
    const { data, error } = await this.supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .select('*')
      .single()

    if (error) throw error
    return data
  }

  async createNotification(
    clientId: string,
    title: string,
    message: string,
    tone: 'success' | 'warning' | 'error' | 'info' = 'info',
    actionUrl?: string
  ) {
    const { data, error } = await this.supabase
      .from('notifications')
      .insert({
        client_id: clientId,
        title,
        message,
        tone,
        action_url: actionUrl || null,
      })
      .select('*')
      .single()

    if (error) throw error
    return data
  }

  // Check-in methods
  async submitCheckIn(checkInData: Omit<ClientCheckIn, 'id' | 'submittedAt'>) {
    const { data, error } = await this.supabase
      .from('client_check_ins')
      .insert({
        client_id: checkInData.clientId,
        week_index: checkInData.weekIndex,
        energy_level: checkInData.energyLevel,
        stress_level: checkInData.stressLevel,
        weight_kg: checkInData.weightKg || null,
        notes: checkInData.notes || null,
        attachments: checkInData.attachments || [],
      })
      .select('*')
      .single()

    if (error) throw error

    // Update last check-in timestamp
    await this.supabase
      .from('client_profiles')
      .update({ last_check_in_at: new Date().toISOString() })
      .eq('id', checkInData.clientId)

    return data
  }

  // Progress photo methods
  async uploadProgressPhoto(photoData: Omit<ProgressPhoto, 'id' | 'uploadedAt'>) {
    const { data, error } = await this.supabase
      .from('progress_photos')
      .insert({
        client_id: photoData.clientId,
        label: photoData.label,
        image_url: photoData.imageUrl,
        content_type: photoData.contentType || null,
        size_bytes: photoData.sizeBytes || null,
      })
      .select('*')
      .single()

    if (error) throw error
    return data
  }

  // Payment methods
  async recordPayment(paymentData: Omit<PaymentRecord, 'id' | 'recordedAt'>) {
    const { data, error } = await this.supabase
      .from('payment_records')
      .insert({
        client_id: paymentData.clientId,
        type: paymentData.type,
        amount: paymentData.amount,
        currency: paymentData.currency,
        status: paymentData.status,
        description: paymentData.description || null,
        invoice_url: paymentData.invoiceUrl || null,
      })
      .select('*')
      .single()

    if (error) throw error
    return data
  }

  // Helper methods
  private mapClientProfile(data: any): ClientProfile {
    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      email: data.email,
      goal: data.goal || '',
      timezone: 'UTC', // Default timezone
      planStartDate: data.plan_start_date || '',
      planEndDate: data.plan_end_date || '',
      assignedTemplateId: data.assigned_template_id,
      templateAdjustments: [], // TODO: Implement template adjustments
      activeChallengeId: data.active_challenge_id,
      adherenceRate: data.adherence_rate,
      completedSessions: data.completed_sessions,
      totalSessions: data.total_sessions,
      subscription: {
        productId: 'basic',
        status: 'active',
        renewsOn: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        autoRenew: true,
      },
      checkIns: (data.client_check_ins || []).map((checkIn: any) => ({
        id: checkIn.id,
        clientId: checkIn.client_id,
        weekIndex: checkIn.week_index,
        submittedAt: checkIn.submitted_at,
        energyLevel: checkIn.energy_level,
        stressLevel: checkIn.stress_level,
        weightKg: checkIn.weight_kg,
        notes: checkIn.notes,
        attachments: checkIn.attachments || [],
      })),
      progressPhotos: (data.progress_photos || []).map((photo: any) => ({
        id: photo.id,
        clientId: photo.client_id,
        label: photo.label,
        uploadedAt: photo.uploaded_at,
        imageUrl: photo.image_url,
        contentType: photo.content_type,
        sizeBytes: photo.size_bytes,
      })),
      payments: (data.payment_records || []).map((payment: any) => ({
        id: payment.id,
        clientId: payment.client_id,
        type: payment.type,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        recordedAt: payment.recorded_at,
        description: payment.description,
        invoiceUrl: payment.invoice_url,
      })),
      lastCheckInAt: data.last_check_in_at,
      profileSettings: {
        preferredName: data.preferred_name,
        birthDate: data.birth_date,
        age: data.age,
        healthNotes: data.health_notes,
        emergencyContact: data.emergency_contact,
      },
    }
  }
}

// Singleton instance
let repository: SupabaseRepository | null = null

export function getSupabaseRepository(): SupabaseRepository {
  if (!repository) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing. Please check your environment variables.')
    }

    repository = new SupabaseRepository(supabaseUrl, supabaseKey)
  }

  return repository
}