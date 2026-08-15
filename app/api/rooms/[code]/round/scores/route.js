import { supabaseServer } from "@/lib/supabaseServer";
import { jsonOk, jsonError, getRoomByCode, authenticateUser, isAdmin } from "@/lib/apiHelpers";
import { getActiveRound } from "@/lib/rounds";

// POST /api/rooms/[code]/round/scores
// body: { userId, token, entries: [{ targetId, points }] }
//   targetId is a user id when the round is scored individually, or a team
//   id when it's scored by team (see round.scoring_mode).
// Admin-only: records scores for the game just played and closes the round.
//
// Scores are replaced wholesale on every submit (delete-then-insert) rather
// than diffed, which keeps this idempotent if the admin's connection is
// flaky and they resubmit — simpler than tracking per-row edits, and rounds
// are small (well under 20 entries).
export async function POST(request, { params }) {
  const supabase = supabaseServer();
  const body = await request.json().catch(() => ({}));
  const entries = Array.isArray(body.entries) ? body.entries : [];

  const room = await getRoomByCode(supabase, params.code);
  if (!room) return jsonError("Room not found.", 404);

  const user = await authenticateUser(supabase, room, body.userId, body.token);
  if (!user) return jsonError("Not signed in to this room.", 401);
  if (!isAdmin(room, user)) return jsonError("Only the room admin can enter scores.", 403);

  const round = await getActiveRound(supabase, room.id);
  if (!round || round.status !== "in_progress") {
    return jsonError("There's no game currently being scored.", 409);
  }

  if (entries.length === 0) return jsonError("Enter at least one score.");

  for (const entry of entries) {
    if (!entry.targetId) return jsonError("Every score needs a player or team.");
    if (typeof entry.points !== "number" || !Number.isFinite(entry.points)) {
      return jsonError("Scores must be numbers.");
    }
  }

  // Validate every target actually belongs to this room, so a stale client
  // can't write scores against another room's ids.
  if (round.scoring_mode === "individual") {
    const { data: validUsers } = await supabase.from("users").select("id").eq("room_id", room.id);
    const validIds = new Set((validUsers || []).map((u) => u.id));
    if (entries.some((e) => !validIds.has(e.targetId))) {
      return jsonError("One of those players doesn't belong to this room.", 400);
    }
  } else {
    const { data: validTeams } = await supabase.from("teams").select("id").eq("room_id", room.id);
    const validIds = new Set((validTeams || []).map((t) => t.id));
    if (entries.some((e) => !validIds.has(e.targetId))) {
      return jsonError("One of those teams doesn't belong to this room.", 400);
    }
  }

  await supabase.from("scores").delete().eq("round_id", round.id);

  const rows = entries.map((e) => ({
    round_id: round.id,
    room_id: room.id,
    user_id: round.scoring_mode === "individual" ? e.targetId : null,
    team_id: round.scoring_mode === "team" ? e.targetId : null,
    points: e.points,
  }));

  const { error: insertError } = await supabase.from("scores").insert(rows);
  if (insertError) return jsonError("Could not save scores. Please try again.", 500);

  await supabase
    .from("rounds")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", round.id);
  await supabase.from("rooms").update({ status: "lobby" }).eq("id", room.id);

  return jsonOk({ success: true });
}
