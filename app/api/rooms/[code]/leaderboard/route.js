import { supabaseServer } from "@/lib/supabaseServer";
import { jsonOk, jsonError, getRoomByCode, authenticateUser } from "@/lib/apiHelpers";

// GET /api/rooms/[code]/leaderboard?userId=&token=&sort=desc|asc
//
// Returns:
//   standings: every player's total across all games, ranked (ties share a
//              rank, e.g. 1, 2, 2, 4 — "dense" competition ranking).
//   history:   one entry per completed round, for the per-game breakdown
//              list under the chart.
//
// Aggregation happens in JS rather than a SQL GROUP BY. At this scale (a
// room tops out around 20 players and a game night rarely runs more than a
// couple dozen rounds) that's simpler to read and debug than a Postgres
// aggregate function, with no meaningful performance cost.
export async function GET(request, { params }) {
  const supabase = supabaseServer();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const token = searchParams.get("token");
  const sort = searchParams.get("sort") === "asc" ? "asc" : "desc";

  const room = await getRoomByCode(supabase, params.code);
  if (!room) return jsonError("Room not found.", 404);

  const user = await authenticateUser(supabase, room, userId, token);
  if (!user) return jsonError("Not signed in to this room.", 401);

  const [{ data: players }, { data: teams }, { data: userScores }, { data: rounds }] = await Promise.all([
    supabase.from("users").select("id, username, team_id").eq("room_id", room.id),
    supabase.from("teams").select("id, name").eq("room_id", room.id),
    supabase.from("user_round_scores").select("user_id, round_id, points").eq("room_id", room.id),
    supabase
      .from("rounds")
      .select("id, scoring_mode, completed_at, winning_game_option_id, game_options(name)")
      .eq("room_id", room.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: true }),
  ]);

  const teamNameById = new Map((teams || []).map((t) => [t.id, t.name]));

  // --- standings -------------------------------------------------------
  const totalsByUser = new Map();
  const gamesByUser = new Map();
  for (const row of userScores || []) {
    totalsByUser.set(row.user_id, (totalsByUser.get(row.user_id) || 0) + Number(row.points));
    if (!gamesByUser.has(row.user_id)) gamesByUser.set(row.user_id, new Set());
    gamesByUser.get(row.user_id).add(row.round_id);
  }

  const standingsUnranked = (players || []).map((p) => ({
    userId: p.id,
    username: p.username,
    teamName: p.team_id ? teamNameById.get(p.team_id) || null : null,
    total: totalsByUser.get(p.id) || 0,
    gamesPlayed: gamesByUser.has(p.id) ? gamesByUser.get(p.id).size : 0,
  }));

  standingsUnranked.sort((a, b) => (sort === "asc" ? a.total - b.total : b.total - a.total));

  let lastTotal = null;
  let lastRank = 0;
  const standings = standingsUnranked.map((row, index) => {
    if (row.total !== lastTotal) {
      lastRank = index + 1;
      lastTotal = row.total;
    }
    return { ...row, rank: lastRank };
  });

  // --- per-round history -------------------------------------------------
  const roundIds = (rounds || []).map((r) => r.id);
  let scoreRowsByRound = new Map();
  if (roundIds.length > 0) {
    const { data: rawScores } = await supabase
      .from("scores")
      .select("round_id, user_id, team_id, points")
      .in("round_id", roundIds);
    const playerNameById = new Map((players || []).map((p) => [p.id, p.username]));
    scoreRowsByRound = new Map();
    for (const s of rawScores || []) {
      const list = scoreRowsByRound.get(s.round_id) || [];
      list.push({
        name: s.user_id ? playerNameById.get(s.user_id) || "Unknown" : teamNameById.get(s.team_id) || "Unknown",
        points: Number(s.points),
      });
      scoreRowsByRound.set(s.round_id, list);
    }
  }

  const history = (rounds || []).map((r) => ({
    roundId: r.id,
    gameName: r.game_options?.name || "Unknown game",
    scoringMode: r.scoring_mode,
    completedAt: r.completed_at,
    entries: (scoreRowsByRound.get(r.id) || []).sort((a, b) => b.points - a.points),
  }));

  return jsonOk({ standings, history });
}
