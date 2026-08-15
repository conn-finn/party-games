import { NextResponse } from "next/server";

export function jsonOk(data, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// Rooms are looked up by their public, human-typed code. Codes are stored
// uppercase; normalize here so a lowercase URL still resolves.
export async function getRoomByCode(supabase, code) {
  if (!code) return null;
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", String(code).toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data;
}

// There is no password — a request "authenticates" by presenting a
// (userId, clientToken) pair that must match a real row in `users` AND
// belong to the room being acted on. The token is an unguessable random
// string the browser keeps in localStorage (see lib/codes.js), so this is
// equivalent in practice to a session cookie, just simpler to reason about
// across a polling-based API.
export async function authenticateUser(supabase, room, userId, token) {
  if (!room || !userId || !token) return null;
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .eq("client_token", token)
    .eq("room_id", room.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function isAdmin(room, user) {
  return Boolean(room && user && room.admin_user_id === user.id);
}
