import { supabaseServer } from "@/lib/supabaseServer";
import { jsonOk, jsonError, getRoomByCode, authenticateUser, isAdmin } from "@/lib/apiHelpers";
import { getActiveRound, ensureScoringModeIsPlayable } from "@/lib/rounds";
import { pickRandomGames } from "@/lib/gameSelection";

// POST /api/rooms/[code]/round/start
// body: { userId, token, scoringMode: 'individual' | 'team' }
// Admin-only: randomly offers 3 games for the room to vote on next.
export async function POST(request, { params }) {
  const supabase = supabaseServer();
  const body = await request.json().catch(() => ({}));
  const scoringMode = body.scoringMode === "team" ? "team" : "individual";

  const room = await getRoomByCode(supabase, params.code);
  if (!room) return jsonError("Room not found.", 404);

  const user = await authenticateUser(supabase, room, body.userId, body.token);
  if (!user) return jsonError("Not signed in to this room.", 401);
  if (!isAdmin(room, user)) return jsonError("Only the room admin can start a round.", 403);

  const existingRound = await getActiveRound(supabase, room.id);
  if (existingRound) return jsonError("A round is already in progress.", 409);

  const scoringError = await ensureScoringModeIsPlayable(supabase, room.id, scoringMode);
  if (scoringError) return jsonError(scoringError, 400);

  const { data: allGames } = await supabase
    .from("game_options")
    .select("id, name, played")
    .eq("room_id", room.id);

  if (!allGames || allGames.length < 1) {
    return jsonError("Add at least one game before starting a round.", 400);
  }

  const chosen = pickRandomGames(allGames, 3);

  const { data: round, error: roundError } = await supabase
    .from("rounds")
    .insert({ room_id: room.id, status: "voting", scoring_mode: scoringMode })
    .select()
    .maybeSingle();

  if (roundError) return jsonError("Could not start the round. Please try again.", 500);

  const { error: optionsError } = await supabase
    .from("round_options")
    .insert(chosen.map((g) => ({ round_id: round.id, game_option_id: g.id })));

  if (optionsError) return jsonError("Could not set up the vote. Please try again.", 500);

  await supabase.from("rooms").update({ status: "voting" }).eq("id", room.id);

  return jsonOk({ roundId: round.id });
}
