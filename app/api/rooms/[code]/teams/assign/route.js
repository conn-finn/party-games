import { supabaseServer } from "@/lib/supabaseServer";
import { jsonOk, jsonError, getRoomByCode, authenticateUser, isAdmin } from "@/lib/apiHelpers";

// POST /api/rooms/[code]/teams/assign
// body: { userId, token, playerId, teamId }  (teamId may be null to unassign)
// Admin-only.
export async function POST(request, { params }) {
  const supabase = supabaseServer();
  const body = await request.json().catch(() => ({}));

  const room = await getRoomByCode(supabase, params.code);
  if (!room) return jsonError("Room not found.", 404);

  const user = await authenticateUser(supabase, room, body.userId, body.token);
  if (!user) return jsonError("Not signed in to this room.", 401);
  if (!isAdmin(room, user)) return jsonError("Only the room admin can assign teams.", 403);

  if (!body.playerId) return jsonError("Missing playerId.");

  const { error } = await supabase
    .from("users")
    .update({ team_id: body.teamId || null })
    .eq("id", body.playerId)
    .eq("room_id", room.id);

  if (error) return jsonError("Could not update that player's team. Please try again.", 500);

  return jsonOk({ success: true });
}
