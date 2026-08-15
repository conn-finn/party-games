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
