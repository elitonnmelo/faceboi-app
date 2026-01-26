import { createClient } from '@supabase/supabase-js';

// Usamos || '' para evitar que o TypeScript reclame de possível valor 'undefined'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);