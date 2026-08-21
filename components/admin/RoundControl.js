"use client";

import { useEffect, useMemo, useState } from "react";
import { apiPost } from "@/lib/apiClient";
import styles from "./RoundControl.module.css";

export default function RoundControl({ code, session, state, refresh }) {
  const { round, players, teams } = state;

  if (!round) return <StartRound code={code} session={session} state={state} refresh={refresh} />;
  if (round.status === "voting") return <VotingControl code={code} session={session} round={round} refresh={refresh} />;
  if (round.status === "in_progress")
    return (
      <ScoreEntry code={code} session={session} round={round} players={players} teams={teams} refresh={refresh} />
    );
  return null;
}

function StartRound({ code, session, state, refresh }) {
  const hasTeamsWithMembers = state.players.some((p) => p.teamId);
  const games = state.adminGameOptions || [];
  const [startMode, setStartMode] = useState("vote"); // 'vote' | 'manual'
  const [scoringMode, setScoringMode] = useState("individual");
  const [selectedGameId, setSelectedGameId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const scoringToggle = (
    <div>
      <span className="field-label">Scoring for this round</span>
      <div className="pill-toggle">
        <button className={scoringMode === "individual" ? "active" : ""} onClick={() => setScoringMode("individual")}>
          By player
        </button>
        <button
          className={scoringMode === "team" ? "active" : ""}
          onClick={() => setScoringMode("team")}
          disabled={!hasTeamsWithMembers}
          title={!hasTeamsWithMembers ? "Assign players to a team first" : undefined}
        >
          By team
        </button>
      </div>
    </div>
  );

  async function handleStartVote() {
    setSubmitting(true);
    setError("");
    try {
      await apiPost(`/api/rooms/${code}/round/start`, {
        userId: session.userId,
        token: session.token,
        scoringMode,
      });
      await refresh();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  async function handleStartManual() {
    if (!selectedGameId) {
      setError("Choose a game first.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await apiPost(`/api/rooms/${code}/round/start-manual`, {
        userId: session.userId,
        token: session.token,
        gameOptionId: selectedGameId,
        scoringMode,
      });
      await refresh();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <section className={`card ${styles.section}`}>
      <h3>Start the next round</h3>

      <div className="pill-toggle">
        <button className={startMode === "vote" ? "active" : ""} onClick={() => setStartMode("vote")}>
          Random vote
        </button>
        <button className={startMode === "manual" ? "active" : ""} onClick={() => setStartMode("manual")}>
          Pick a game
        </button>
      </div>

      {startMode === "vote" ? (
        <>
          <p className={styles.subtitle}>3 random games will be offered for a vote — players won&rsquo;t see the rest of the list.</p>
          {scoringToggle}
          {error && <p className="error-banner">{error}</p>}
          <button className="btn btn-primary btn-block" onClick={handleStartVote} disabled={submitting}>
            {submitting ? <span className="spinner" /> : "Start voting round"}
          </button>
        </>
      ) : (
        <>
          <p className={styles.subtitle}>
            Jump straight into a game you choose — there&rsquo;s no vote, so players won&rsquo;t see this screen at all.
          </p>

          <div>
            <span className="field-label">Game</span>
            <select
              className={`text-input ${styles.gameSelect}`}
              value={selectedGameId}
              onChange={(e) => setSelectedGameId(e.target.value)}
            >
              <option value="">Choose a game…</option>
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                  {g.played ? " (played)" : ""}
                </option>
              ))}
            </select>
          </div>

          {scoringToggle}

          {error && <p className="error-banner">{error}</p>}

          <button
            className="btn btn-primary btn-block"
            onClick={handleStartManual}
            disabled={submitting || !selectedGameId}
          >
            {submitting ? <span className="spinner" /> : "Start this game now"}
          </button>
        </>
      )}
    </section>
  );
}

function VotingControl({ code, session, round, refresh }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleEndVoting() {
    setSubmitting(true);
    setError("");
    try {
      await apiPost(`/api/rooms/${code}/round/end-voting`, {
        userId: session.userId,
        token: session.token,
      });
      await refresh();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  const totalVotes = round.totalVotes ?? 0;

  return (
    <section className={`card ${styles.section}`}>
      <h3>Voting in progress</h3>
      <p className={styles.subtitle}>{totalVotes} vote{totalVotes === 1 ? "" : "s"} cast so far. Check the Vote tab for the live tally.</p>

      {error && <p className="error-banner">{error}</p>}

      <button className="btn btn-primary btn-block" onClick={handleEndVoting} disabled={submitting}>
        {submitting ? <span className="spinner" /> : "End voting & start the game"}
      </button>
    </section>
  );
}

function ScoreEntry({ code, session, round, players, teams, refresh }) {
  const targets = useMemo(() => {
    if (round.scoringMode === "team") {
      const teamIdsWithMembers = new Set(players.filter((p) => p.teamId).map((p) => p.teamId));
      return teams.filter((t) => teamIdsWithMembers.has(t.id)).map((t) => ({ id: t.id, label: t.name }));
    }
    return players.map((p) => ({ id: p.id, label: p.username }));
  }, [round.scoringMode, players, teams]);

  const [values, setValues] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const initial = {};
    for (const t of targets) initial[t.id] = "";
    for (const s of round.existingScores || []) {
      const key = round.scoringMode === "team" ? s.team_id : s.user_id;
      if (key && key in initial) initial[key] = String(s.points);
    }
    setValues(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.id]);

  function setValue(id, val) {
    setValues((prev) => ({ ...prev, [id]: val }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    const entries = targets.map((t) => ({ targetId: t.id, points: Number(values[t.id]) || 0 }));
    try {
      await apiPost(`/api/rooms/${code}/round/scores`, {
        userId: session.userId,
        token: session.token,
        entries,
      });
      await refresh();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <section className={`card ${styles.section}`}>
      <h3>Enter scores</h3>
      <p className={styles.subtitle}>
        {round.winningGameName} · scoring by {round.scoringMode === "team" ? "team" : "player"}
      </p>

      <div className={styles.scoreList}>
        {targets.map((t) => (
          <div key={t.id} className={styles.scoreRow}>
            <span className={styles.scoreLabel}>{t.label}</span>
            <input
              className={`text-input ${styles.scoreInput}`}
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={values[t.id] ?? ""}
              onChange={(e) => setValue(t.id, e.target.value)}
            />
          </div>
        ))}
        {targets.length === 0 && <p className={styles.subtitle}>No {round.scoringMode === "team" ? "teams" : "players"} to score.</p>}
      </div>

      {error && <p className="error-banner">{error}</p>}

      <button className="btn btn-primary btn-block" onClick={handleSubmit} disabled={submitting || targets.length === 0}>
        {submitting ? <span className="spinner" /> : "Submit scores & finish round"}
      </button>
    </section>
  );
}
