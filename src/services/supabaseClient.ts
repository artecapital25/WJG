import { createClient } from '@supabase/supabase-js';

const metaEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};

// Carga segura y estricta desde variables de entorno (Vite / Vercel)
const supabaseUrl = 
  metaEnv.VITE_SUPABASE_URL || 
  metaEnv.NEXT_PUBLIC_SUPABASE_URL || 
  '';

const supabaseAnonKey = 
  metaEnv.VITE_SUPABASE_ANON_KEY || 
  metaEnv.VITE_SUPABASE_PUBLISHABLE_KEY || 
  metaEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
  metaEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured && typeof window !== 'undefined') {
  console.warn(
    '⚠️ [WJGEEKS 3D] Supabase no está configurado. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu archivo .env local o en el panel de Vercel.'
  );
}

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }) 
  : null;

