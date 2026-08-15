import { supabaseServer } from "@/lib/supabaseServer";
import { jsonOk, jsonError, getRoomByCode, authenticateUser, isAdmin } from "@/lib/apiHelpers";

// POST /api/rooms/[code]/teams
// body: { userId, token, name }
// Admin-only: create a new team that players can be assigned to.
export async function POST(request, { params }) {
  const supabase = supabaseServer();
  const body = await request.json().catch(() => ({}));
  const name = (body.name || "").trim();

  const room = await getRoomByCode(supabase, params.code);
  if (!room) return jsonError("Room not found.", 404);

  const user = await authenticateUser(supabase, room, body.userId, body.token);
  if (!user) return jsonError("Not signed in to this room.", 401);
  if (!isAdmin(room, user)) return jsonError("Only the room admin can create teams.", 403);

  if (!name) return jsonError("Enter a team name.");
  if (name.length > 40) return jsonError("Team names must be 40 characters or fewer.");

  const { data, error } = await supabase
    .from("teams")
    .insert({ room_id: room.id, name })
    .select("id, name")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") return jsonError("A team with that name already exists.", 409);
    return jsonError("Could not create that team. Please try again.", 500);
  }

  return jsonOk({ team: data });
}
