import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabasePublishableKey, supabaseUrl } from "./env";

/** Client im Namen des eingeloggten Nutzers (RLS greift). */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // In Server Components nicht erlaubt; der Proxy erneuert die Session.
        }
      },
    },
  });
}

/** Secret-Key-Client: umgeht RLS. Nur für Streak und Belohnungen nach geprüfter Session. */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY fehlt (.env.local bzw. Vercel-Env-Vars)");
  return createPlainClient(supabaseUrl(), key, { auth: { persistSession: false, autoRefreshToken: false } });
}
