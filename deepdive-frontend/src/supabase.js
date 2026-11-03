import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseClient = async (clerkToken) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.")
  }
  if (!clerkToken) {
    throw new Error("A Clerk Supabase JWT is required to access report history.")
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${clerkToken}` } },
  })
}
