import { supabaseServer } from "@/lib/supabaseServer";
import { jsonOk, jsonError, getRoomByCode, authenticateUser, isAdmin } from "@/lib/apiHelpers";
import { getActiveRound } from "@/lib/rounds";

// POST /api/rooms/[code]/round/end-voting
// body: { userId, token }
// Admin-only: closes voting, tallies votes, and locks in the winning game
// (ties are broken randomly). This is the "click a button to start the
// game" moment from the brief.
export async function POST(request, { params }) {
  const supabase = supabaseServer();
  const body = await request.json().catch(() => ({}));

  const room = await getRoomByCode(supabase, params.code);
  if (!room) return jsonError("Room not found.", 404);

  const user = await authenticateUser(supabase, room, body.userId, body.token);
  if (!user) return jsonError("Not signed in to this room.", 401);
  if (!isAdmin(room, user)) return jsonError("Only the room admin can end voting.", 403);

  const round = await getActiveRound(supabase, room.id);
  if (!round || round.status !== "voting") return jsonError("There's no vote in progress.", 409);

  const { data: roundOptions } = await supabase
    .from("round_options")
    .select("game_option_id")
    .eq("round_id", round.id);

  const { data: votes } = await supabase
    .from("votes")
    .select("game_option_id")
    .eq("round_id", round.id);

  const tally = {};
  for (const opt of roundOptions || []) tally[opt.game_option_id] = 0;
  for (const v of votes || []) tally[v.game_option_id] = (tally[v.game_option_id] || 0) + 1;

  const maxVotes = Math.max(...Object.values(tally));
  const winners = Object.entries(tally)
    .filter(([, count]) => count === maxVotes)
    .map(([gameOptionId]) => gameOptionId);
  const winningGameOptionId = winners[Math.floor(Math.random() * winners.length)];

  const { error: roundError } = await supabase
    .from("rounds")
    .update({
      status: "in_progress",
      winning_game_option_id: winningGameOptionId,
      voting_ended_at: new Date().toISOString(),
    })
    .eq("id", round.id);
  if (roundError) return jsonError("Could not lock in a winner. Please try again.", 500);

  await supabase.from("game_options").update({ played: true }).eq("id", winningGameOptionId);
  await supabase.from("rooms").update({ status: "in_progress" }).eq("id", room.id);

  return jsonOk({ winningGameOptionId });
}
