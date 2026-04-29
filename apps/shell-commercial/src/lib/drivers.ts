import { SupabaseBrowserAuthDriver } from "@aethereos/drivers-supabase/browser";

export interface CloudDrivers {
  auth: SupabaseBrowserAuthDriver;
}

export function buildDrivers(): CloudDrivers {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  return {
    auth: new SupabaseBrowserAuthDriver({ supabaseUrl, supabaseAnonKey }),
  };
}
