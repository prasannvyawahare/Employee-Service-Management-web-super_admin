import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client for Client Components. Same project the
 * Flutter app talks to (see fieldforce/lib/core/services/supabase_service.dart)
 * — same auth.users, same JWT app_metadata.role claim, same RLS.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
