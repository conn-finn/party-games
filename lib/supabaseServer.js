import { createClient } from "@supabase/supabase-js";

// This client is imported ONLY by files under app/api/** (server-side route
// handlers), never by client components. It uses the Supabase
// "service_role" key, which bypasses Row Level Security entirely — that is
// deliberate (see supabase/schema.sql) and is why this key must never be
// prefixed with NEXT_PUBLIC_ or sent to the browser in any response.
let cachedClient = null;

export function supabaseServer() {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables. " +
        "Copy .env.example to .env.local and fill them in (see README.md)."
    );
  }

  cachedClient = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  return cachedClient;
}
