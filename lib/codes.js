import crypto from "crypto";

// Characters chosen to avoid visual ambiguity on a small phone screen
// (no 0/O, 1/I/L, etc.) since players type this in by hand.
const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateRoomCode(length = 4) {
  let code = "";
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    code += ROOM_CODE_ALPHABET[bytes[i] % ROOM_CODE_ALPHABET.length];
  }
  return code;
}

// A private, unguessable token the browser stores in localStorage. Knowing
// a user's *name* is public (everyone in the room can see it); knowing a
// user's *token* is what proves "this browser is that player" and is what
// allows a silent rejoin after accidentally closing the app.
export function generateClientToken() {
  return crypto.randomBytes(24).toString("base64url");
}
