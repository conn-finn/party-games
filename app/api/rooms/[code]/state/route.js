import { supabaseServer } from "@/lib/supabaseServer";
import { jsonOk, jsonError, getRoomByCode, authenticateUser, isAdmin } from "@/lib/apiHelpers";
import { getActiveRound } from "@/lib/rounds";

// GET /api/rooms/[code]/state?userId=&token=
//
// The single "give me everything the current screen needs" endpoint. The
// client polls this on an interval (see hooks/useRoom.js) — with <50
// concurrent players this is far simpler and cheaper to host than a
// websocket server, at the cost of a few seconds of latency, which is fine
// for a party game.
//
// Non-admins deliberately get a trimmed-down view: during voting they don't
// see the full game pool or per-option vote tallies (keeps some
// suspense, and matches "each user cannot see the remaining games").
export async function GET(request, { params }) {
  const supabase = supabaseServer();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const token = searchParams.get("token");

  const room = await getRoomByCode(supabase, params.code);
  if (!room) return jsonError("Room not found.", 404);

  const user = await authenticateUser(supabase, room, userId, token);
  if (!user) return jsonError("Not signed in to this room.", 401);

  // Don't block the response on this — it's a nice-to-have "who's still
  // around" signal, not critical path.
  supabase.from("users").update({ last_seen_at: new Date().toISOString() }).eq("id", user.id).then(() => {});

  const admin = isAdmin(room, user);

  const [{ data: players }, { data: teams }] = await Promise.all([
    supabase
      .from("users")
      .select("id, username, is_admin, team_id, created_at")
      .eq("room_id", room.id)
      .order("created_at", { ascending: true }),
    supabase.from("teams").select("id, name").eq("room_id", room.id).order("name"),
  ]);

  const payload = {
    room: { code: room.code, status: room.status, createdAt: room.created_at },
    isAdmin: admin,
    self: { id: user.id, username: user.username, teamId: user.team_id },
    players: (players || []).map((p) => ({
      id: p.id,
      username: p.username,
      isAdmin: p.is_admin,
      teamId: p.team_id,
    })),
    teams: teams || [],
    round: null,
    adminGameOptions: null,
  };

  if (admin) {
    const { data: gameOptions } = await supabase
      .from("game_options")
      .select("id, name, played")
      .eq("room_id", room.id)
      .order("name");
    payload.adminGameOptions = gameOptions || [];
  }

  const round = await getActiveRound(supabase, room.id);
  if (round) {
    payload.round = await buildRoundPayload(supabase, round, admin, user.id);
  }

  return jsonOk(payload);
}

async function buildRoundPayload(supabase, round, admin, selfUserId) {
  const { data: roundOptions } = await supabase
    .from("round_options")
    .select("id, game_option_id, game_options(name)")
    .eq("round_id", round.id);

  const options = (roundOptions || []).map((ro) => ({
    id: ro.id,
    gameOptionId: ro.game_option_id,
    name: ro.game_options?.name || "Unknown game",
  }));

  const base = {
    id: round.id,
    status: round.status,
    scoringMode: round.scoring_mode,
    options,
  };

  if (round.status === "voting") {
    const { data: votes } = await supabase
      .from("votes")
      .select("user_id, game_option_id")
      .eq("round_id", round.id);

    const myVote = (votes || []).find((v) => v.user_id === selfUserId);
    base.myVoteGameOptionId = myVote ? myVote.game_option_id : null;
    base.totalVotes = (votes || []).length;

    if (admin) {
      const tally = {};
      for (const opt of options) tally[opt.gameOptionId] = 0;
      for (const v of votes || []) {
        tally[v.game_option_id] = (tally[v.game_option_id] || 0) + 1;
      }
      base.tally = tally;
    }
  }

  if (round.status === "in_progress") {
    const winningOption = options.find((o) => o.gameOptionId === round.winning_game_option_id);
    base.winningGameName = winningOption ? winningOption.name : null;
    base.winningGameOptionId = round.winning_game_option_id;

    if (admin) {
      const { data: existingScores } = await supabase
        .from("scores")
        .select("user_id, team_id, points")
        .eq("round_id", round.id);
      base.existingScores = existingScores || [];
    }
  }

  return base;
}
