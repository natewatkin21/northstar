/**
 * Supabase Client Configuration
 * 
 * Configures and exports a Supabase client for database interactions.
 * 
 * Database Schema:
 * 1. workout_plans
 *    - id: uuid (primary key)
 *    - user_id: text (from Clerk)
 *    - name: text
 *    - created_at: timestamptz
 * 
 * 2. plan_day_exercises
 *    - id: uuid (primary key)
 *    - plan_id: uuid (references workout_plans)
 *    - exercise_id: uuid (references exercises)
 *    - day_name: text
 *    - day_order: int
 *    - sets: int
 *    - reps: int
 *    - rest_seconds: int
 *    - created_at: timestamptz
 * 
 * Authentication:
 * - Uses Clerk for auth
 * - JWT token passed to Supabase
 * - RLS policies ensure data isolation
 */

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
