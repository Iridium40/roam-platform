// Re-export from the main singleton file to prevent multiple GoTrueClient instances
// All Supabase client creation should happen in ../supabase.ts
export { supabase, supabaseAdmin } from "../supabase";
export type { Database } from "@roam/shared";
export type { AuthCustomer, AuthProvider } from "@roam/shared";
