import { supabaseServer } from "@/lib/supabaseServer";
import { jsonOk, jsonError, getRoomByCode, authenticateUser } from "@/lib/apiHelpers";
import { getActiveRound } from "@/lib/rounds";

// POST /api/rooms/[code]/round/vote
// body: { userId, token, gameOptionId }
// Any player: cast (or change, up until voting ends) their vote.
export async function POST(request, { params }) {
  const supabase = supabaseServer();
  const body = await request.json().catch(() => ({}));

  const room = await getRoomByCode(supabase, params.code);
  if (!room) return jsonError("Room not found.", 404);

  const user = await authenticateUser(supabase, room, body.userId, body.token);
  if (!user) return jsonError("Not signed in to this room.", 401);

  const round = await getActiveRound(supabase, room.id);
  if (!round || round.status !== "voting") return jsonError("Voting isn't open right now.", 409);

  if (!body.gameOptionId) return jsonError("Missing gameOptionId.");

  const { data: validOption } = await supabase
    .from("round_options")
    .select("id")
    .eq("round_id", round.id)
    .eq("game_option_id", body.gameOptionId)
    .maybeSingle();
  if (!validOption) return jsonError("That isn't one of this round's choices.", 400);

  const { error } = await supabase
    .from("votes")
    .upsert(
      { round_id: round.id, user_id: user.id, game_option_id: body.gameOptionId },
      { onConflict: "round_id,user_id" }
    );

  if (error) return jsonError("Could not save your vote. Please try again.", 500);

  return jsonOk({ success: true });
}
