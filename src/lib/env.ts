export interface SupabaseEnvironment {
  supabaseUrl: string
  supabaseAnonKey: string
}

export function getSupabaseEnvironment(): SupabaseEnvironment | null {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  return { supabaseUrl, supabaseAnonKey }
}
