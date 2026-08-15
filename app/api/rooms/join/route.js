import { supabaseServer } from "@/lib/supabaseServer";
import { generateRoomCode, generateClientToken } from "@/lib/codes";
import { DEFAULT_GAMES } from "@/lib/defaultGames";
import { jsonOk, jsonError, getRoomByCode } from "@/lib/apiHelpers";

// POST /api/rooms/join
// body: { username: string, roomCode?: string }
//
// If roomCode is omitted/blank, a brand new room is created and the caller
// becomes its admin (first person in = admin, per the brief). Otherwise the
// caller joins the existing room as a regular player.
export async function POST(request) {
  const supabase = supabaseServer();
  const body = await request.json().catch(() => ({}));
  const username = (body.username || "").trim();
  const roomCodeInput = (body.roomCode || "").trim();

  if (!username) return jsonError("Enter a name to play as.");
  if (username.length > 24) return jsonError("Names must be 24 characters or fewer.");

  if (!roomCodeInput) {
    return createRoomAndJoin(supabase, username);
  }
  return joinExistingRoom(supabase, username, roomCodeInput);
}

async function createRoomAndJoin(supabase, username) {
  // Small retry loop in case of a random room-code collision (astronomically
  // unlikely at this scale, but cheap to guard against).
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .insert({ code, status: "lobby" })
      .select()
      .maybeSingle();

    if (roomError) {
      if (roomError.code === "23505") continue; // unique_violation on code, retry
      console.error("[POST /api/rooms/join] room insert failed:", roomError);
      return jsonError("Could not create a room right now. Please try again.", 500);
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .insert({
        room_id: room.id,
        username,
        is_admin: true,
        client_token: generateClientToken(),
      })
      .select()
      .maybeSingle();

    if (userError) {
      console.error("[POST /api/rooms/join] user insert failed:", userError);
      return jsonError("Could not create your player. Please try again.", 500);
    }

    await supabase.from("rooms").update({ admin_user_id: user.id }).eq("id", room.id);

    await supabase
      .from("game_options")
      .insert(DEFAULT_GAMES.map((name) => ({ room_id: room.id, name })));

    return jsonOk({
      room: { code: room.code, status: room.status },
      user: { id: user.id, username: user.username, isAdmin: true, teamId: null },
      token: user.client_token,
    });
  }

  return jsonError("Could not generate a unique room code. Please try again.", 500);
}

async function joinExistingRoom(supabase, username, roomCodeInput) {
  const room = await getRoomByCode(supabase, roomCodeInput);
  if (!room) return jsonError("No room found with that code. Double-check it and try again.", 404);
  if (room.status === "ended") return jsonError("This room has already ended.", 410);

  const { data: user, error: userError } = await supabase
    .from("users")
    .insert({
      room_id: room.id,
      username,
      is_admin: false,
      client_token: generateClientToken(),
    })
    .select()
    .maybeSingle();

  if (userError) {
    if (userError.code === "23505") {
      return jsonError(
        "That name is already taken in this room. If that's you rejoining, open the app on the device you originally joined from — otherwise pick a different name.",
        409
      );
    }
    console.error("[POST /api/rooms/join] joinExistingRoom user insert failed:", userError);
    return jsonError("Could not join the room. Please try again.", 500);
  }

  return jsonOk({
    room: { code: room.code, status: room.status },
    user: { id: user.id, username: user.username, isAdmin: false, teamId: user.team_id },
    token: user.client_token,
  });
}
