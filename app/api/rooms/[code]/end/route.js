import { supabaseServer } from "@/lib/supabaseServer";
import { jsonOk, jsonError, getRoomByCode, authenticateUser, isAdmin } from "@/lib/apiHelpers";

// POST /api/rooms/[code]/end
// body: { userId, token }
// Admin-only: permanently ends the room. Rooms otherwise stay open
// indefinitely (per the brief) — there is no auto-expiry.
export async function POST(request, { params }) {
  const supabase = supabaseServer();
  const body = await request.json().catch(() => ({}));

  const room = await getRoomByCode(supabase, params.code);
  if (!room) return jsonError("Room not found.", 404);

  const user = await authenticateUser(supabase, room, body.userId, body.token);
  if (!user) return jsonError("Not signed in to this room.", 401);
  if (!isAdmin(room, user)) return jsonError("Only the room admin can end the room.", 403);

  await supabase
    .from("rooms")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", room.id);

  return jsonOk({ success: true });
}
