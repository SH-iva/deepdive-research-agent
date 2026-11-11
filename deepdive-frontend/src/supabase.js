import { useMemo } from "react";
import { useSession } from "@clerk/clerk-react";
import { createClient } from "@supabase/supabase-js";

// Clerk's native Supabase integration: Supabase receives Clerk's own session token.
// No JWT template needed. The token must carry role=authenticated (see README).
export function useSupabase() {
  const { session } = useSession();
  return useMemo(
    () =>
      createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
        accessToken: async () => (await session?.getToken()) ?? null,
      }),
    [session]
  );
}
