import { supabaseServer } from "@/lib/supabaseServer";
import { jsonOk, jsonError, getRoomByCode, authenticateUser, isAdmin } from "@/lib/apiHelpers";
import { getActiveRound, ensureScoringModeIsPlayable } from "@/lib/rounds";

// POST /api/rooms/[code]/round/start-manual
// body: { userId, token, gameOptionId, scoringMode: 'individual' | 'team' }
// Admin-only: skips voting entirely and jumps straight to "in_progress" with
// a game the admin hand-picked. No `round_options` rows are created, so
// non-admin players never see a vote for this round at all — the room's
// status goes straight from `lobby` to `in_progress`, and the state
// endpoint's non-admin view has nothing voting-related to show.
export async function POST(request, { params }) {
  const supabase = supabaseServer();
  const body = await request.json().catch(() => ({}));
  const scoringMode = body.scoringMode === "team" ? "team" : "individual";

  const room = await getRoomByCode(supabase, params.code);
  if (!room) return jsonError("Room not found.", 404);

  const user = await authenticateUser(supabase, room, body.userId, body.token);
  if (!user) return jsonError("Not signed in to this room.", 401);
  if (!isAdmin(room, user)) return jsonError("Only the room admin can start a game.", 403);

  const existingRound = await getActiveRound(supabase, room.id);
  if (existingRound) return jsonError("A round is already in progress.", 409);

  if (!body.gameOptionId) return jsonError("Choose a game to start.");

  const scoringError = await ensureScoringModeIsPlayable(supabase, room.id, scoringMode);
  if (scoringError) return jsonError(scoringError, 400);

  const { data: game } = await supabase
    .from("game_options")
    .select("id, name")
    .eq("id", body.gameOptionId)
    .eq("room_id", room.id)
    .maybeSingle();
  if (!game) return jsonError("That game doesn't belong to this room.", 400);

  const { data: round, error: roundError } = await supabase
    .from("rounds")
    .insert({
      room_id: room.id,
      status: "in_progress",
      scoring_mode: scoringMode,
      winning_game_option_id: game.id,
    })
    .select()
    .maybeSingle();

  if (roundError) {
    console.error("[POST /api/rooms/[code]/round/start-manual] round insert failed:", roundError);
    return jsonError("Could not start that game. Please try again.", 500);
  }

  await supabase.from("game_options").update({ played: true }).eq("id", game.id);
  await supabase.from("rooms").update({ status: "in_progress" }).eq("id", room.id);

  return jsonOk({ roundId: round.id });
}
