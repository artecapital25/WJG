import { createClient } from '@supabase/supabase-js';

const metaEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};

// Detección automática de variables de entorno (Vite / Vercel) con respaldo directo al proyecto oficial
const supabaseUrl = 
  metaEnv.VITE_SUPABASE_URL || 
  metaEnv.NEXT_PUBLIC_SUPABASE_URL || 
  'https://brjzpbqxjakihpsbkqfh.supabase.co';

const supabaseAnonKey = 
  metaEnv.VITE_SUPABASE_ANON_KEY || 
  metaEnv.VITE_SUPABASE_PUBLISHABLE_KEY || 
  metaEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
  metaEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  'sb_publishable_vbV0_7HeqzEVKZuvcuM0EQ_y6fa9ooh';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;
