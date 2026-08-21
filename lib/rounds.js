// A room has at most one "active" round at a time (either collecting votes
// or currently being played/scored). Every round-related route needs this
// lookup, so it lives in one place.
export async function getActiveRound(supabase, roomId) {
  const { data, error } = await supabase
    .from("rounds")
    .select("*")
    .eq("room_id", roomId)
    .in("status", ["voting", "in_progress"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Shared by both round/start (random vote) and round/start-manual (admin
// hand-picks the game): team scoring only makes sense once at least one
// team actually has a player on it.
export async function ensureScoringModeIsPlayable(supabase, roomId, scoringMode) {
  if (scoringMode !== "team") return null;
  const { data: teamsWithMembers } = await supabase
    .from("users")
    .select("team_id")
    .eq("room_id", roomId)
    .not("team_id", "is", null);
  const distinctTeams = new Set((teamsWithMembers || []).map((r) => r.team_id));
  if (distinctTeams.size === 0) {
    return "Create at least one team with players on it before scoring by team.";
  }
  return null;
}
