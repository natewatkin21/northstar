import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create a Supabase client with a custom auth token
export function createSupabaseClient(token?: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: token ? {
        Authorization: `Bearer ${token}`
      } : undefined
    }
  })
}

// Create a default Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
