import { supabaseServer } from "@/lib/supabaseServer";
import { jsonOk, jsonError, getRoomByCode, authenticateUser, isAdmin } from "@/lib/apiHelpers";

// POST /api/rooms/[code]/games
// body: { userId, token, name }
// Admin-only: add a new game to this room's voting pool.
export async function POST(request, { params }) {
  const supabase = supabaseServer();
  const body = await request.json().catch(() => ({}));
  const name = (body.name || "").trim();

  const room = await getRoomByCode(supabase, params.code);
  if (!room) return jsonError("Room not found.", 404);

  const user = await authenticateUser(supabase, room, body.userId, body.token);
  if (!user) return jsonError("Not signed in to this room.", 401);
  if (!isAdmin(room, user)) return jsonError("Only the room admin can add games.", 403);

  if (!name) return jsonError("Enter a game name.");
  if (name.length > 60) return jsonError("Game names must be 60 characters or fewer.");

  const { data, error } = await supabase
    .from("game_options")
    .insert({ room_id: room.id, name })
    .select("id, name, played")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") return jsonError("That game is already in the list.", 409);
    return jsonError("Could not add that game. Please try again.", 500);
  }

  return jsonOk({ game: data });
}
