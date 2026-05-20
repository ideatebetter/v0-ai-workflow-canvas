import { createClient } from '@supabase/supabase-js'

/**
 * Admin client with service role key for privileged operations.
 * Use this ONLY for admin operations like creating users.
 * This client bypasses Row Level Security.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
