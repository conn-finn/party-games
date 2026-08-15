"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiGet, apiPost } from "@/lib/apiClient";
import { loadSession, saveSession, clearSession } from "@/lib/clientSession";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <Suspense fallback={<CheckingSession />}>
      <HomePageInner />
    </Suspense>
  );
}

function HomePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillCode = (searchParams.get("code") || "").toUpperCase();

  const [checkingSession, setCheckingSession] = useState(true);
  const [mode, setMode] = useState(prefillCode ? "join" : "create");
  const [username, setUsername] = useState("");
  const [roomCode, setRoomCode] = useState(prefillCode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // On load, try a silent rejoin if this browser already has a saved seat.
  // If the URL is pointing at a *different* room than the saved session
  // (e.g. someone shared a room link), skip auto-rejoin and let them join
  // that room fresh instead.
  useEffect(() => {
    const session = loadSession();
    if (!session || (prefillCode && session.code !== prefillCode)) {
      setCheckingSession(false);
      return;
    }
    apiGet(`/api/rooms/${session.code}/state?userId=${session.userId}&token=${session.token}`)
      .then(() => router.replace(`/room/${session.code}`))
      .catch(() => {
        clearSession();
        setCheckingSession(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const trimmedName = username.trim();
    if (!trimmedName) {
      setError("Enter a name to play as.");
      return;
    }
    if (mode === "join" && roomCode.trim().length < 4) {
      setError("Enter the 4-letter room code.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await apiPost("/api/rooms/join", {
        username: trimmedName,
        roomCode: mode === "join" ? roomCode.trim() : "",
      });
      saveSession({
        code: data.room.code,
        userId: data.user.id,
        token: data.token,
        username: data.user.username,
      });
      router.push(`/room/${data.room.code}`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  if (checkingSession) return <CheckingSession />;

  return (
    <main className={styles.wrap}>
      <div className={styles.hero}>
        <div className={styles.emoji} aria-hidden="true">
          🎉
        </div>
        <h1 className={styles.title}>Game Night</h1>
        <p className={styles.tagline}>Vote on what to play. Track every score. Crown a winner.</p>
      </div>

      <form className={`card ${styles.card}`} onSubmit={handleSubmit}>
        <div className={`pill-toggle ${styles.modeToggle}`} role="tablist" aria-label="Create or join a room">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "create"}
            className={mode === "create" ? "active" : ""}
            onClick={() => setMode("create")}
          >
            New room
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "join"}
            className={mode === "join" ? "active" : ""}
            onClick={() => setMode("join")}
          >
            Join room
          </button>
        </div>

        <div>
          <label className="field-label" htmlFor="username">
            Your name
          </label>
          <input
            id="username"
            className="text-input"
            placeholder="Alex"
            maxLength={24}
            autoComplete="off"
            autoCapitalize="words"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        {mode === "join" && (
          <div>
            <label className="field-label" htmlFor="roomCode">
              Room code
            </label>
            <input
              id="roomCode"
              className={`text-input ${styles.codeInput}`}
              placeholder="AB12"
              maxLength={6}
              autoComplete="off"
              autoCapitalize="characters"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            />
          </div>
        )}

        {error && <p className="error-banner">{error}</p>}

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? (
            <span className="spinner" />
          ) : mode === "create" ? (
            "Create room & play"
          ) : (
            "Join room"
          )}
        </button>

        {mode === "create" && (
          <p className={styles.hint}>You'll get a room code to share — first one in runs the show.</p>
        )}
      </form>
    </main>
  );
}

function CheckingSession() {
  return (
    <main className={styles.wrap}>
      <div className={styles.hero}>
        <div className={styles.emoji} aria-hidden="true">
          🎉
        </div>
        <h1 className={styles.title}>Game Night</h1>
      </div>
      <div className={styles.loadingRow}>
        <span className="spinner" />
        <span>Checking for your seat…</span>
      </div>
    </main>
  );
}
