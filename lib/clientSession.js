"use client";

// The app only ever tracks one active room per browser at a time — that
// matches how this gets used in practice (one phone, one game night) and
// keeps "rejoin after accidentally closing the tab" a one-key lookup
// instead of a multi-room session manager.
const STORAGE_KEY = "gameNight:session";

export function saveSession(session) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // localStorage can throw in private-browsing edge cases; the app still
    // works, the player just won't auto-rejoin after closing the tab.
  }
}

export function loadSession() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
