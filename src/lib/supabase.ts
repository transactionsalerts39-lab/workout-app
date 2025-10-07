import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type CreateSupabaseClientOptions = {
  supabaseUrl: string
  supabaseAnonKey: string
}

let cachedClient: SupabaseClient | null = null

export function getSupabaseClient(options: CreateSupabaseClientOptions): SupabaseClient {
  if (!cachedClient) {
    cachedClient = createClient(options.supabaseUrl, options.supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    })
  }
  return cachedClient
}
