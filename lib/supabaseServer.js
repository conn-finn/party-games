import { createClient } from "@supabase/supabase-js";

// This client is imported ONLY by files under app/api/** (server-side route
// handlers), never by client components. It uses the Supabase
// "service_role" key, which bypasses Row Level Security entirely — that is
// deliberate (see supabase/schema.sql) and is why this key must never be
// prefixed with NEXT_PUBLIC_ or sent to the browser in any response.
let cachedClient = null;

export function supabaseServer() {
  if (cachedClient) return cachedClient;

  const rawUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!rawUrl || !serviceKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables. " +
        "Copy .env.example to .env.local and fill them in (see README.md)."
    );
  }

  // Strip any trailing slash (and accidentally-pasted /rest/v1 suffix) so we
  // don't build a malformed double path like ".../rest/v1/rest/v1/rooms" —
  // that produces PostgREST's cryptic "PGRST125: Invalid path specified in
  // request URL" error.
  const url = rawUrl.trim().replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");

  cachedClient = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  return cachedClient;
}
