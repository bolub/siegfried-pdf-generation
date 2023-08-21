import { type SupabaseClient, createClient } from '@supabase/supabase-js';

export const supabase =
  // @ts-ignore
  (global.supabase as SupabaseClient) ||
  (process.env.SUPABASE_URL &&
    process.env.SUPABASE_KEY &&
    createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
      auth: {
        persistSession: false,
      },
    }));

// do we still need this?
if (process.env.NODE_ENV !== 'production') {
  // @ts-ignore
  global.supabase = supabase;
}
