import { createClient } from "@supabase/supabase-js";
import type { Database } from "@roam/shared";
import { logger } from '@/utils/logger';

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

// Use placeholder values if environment variables are not set
const fallbackUrl = "https://placeholder.supabase.co";
const fallbackKey = "placeholder-key";

export const supabase = createClient<Database>(
  supabaseUrl || fallbackUrl,
  supabaseAnonKey || fallbackKey
);

// Log a warning if using fallback values
if (!supabaseUrl || !supabaseAnonKey) {
  logger.warn("⚠️ Supabase environment variables not set. Using placeholder values. Please set VITE_PUBLIC_SUPABASE_URL and VITE_PUBLIC_SUPABASE_ANON_KEY in your .env file.");
}
