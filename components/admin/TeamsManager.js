"use client";

import { useState } from "react";
import { apiPost } from "@/lib/apiClient";
import styles from "./TeamsManager.module.css";

export default function TeamsManager({ code, session, teams, players, refresh }) {
  const [teamName, setTeamName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [assigningId, setAssigningId] = useState(null);
  const [error, setError] = useState("");

  async function handleCreateTeam(e) {
    e.preventDefault();
    const trimmed = teamName.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError("");
    try {
      await apiPost(`/api/rooms/${code}/teams`, {
        userId: session.userId,
        token: session.token,
        name: trimmed,
      });
      setTeamName("");
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAssign(playerId, teamId) {
    setAssigningId(playerId);
    setError("");
    try {
      await apiPost(`/api/rooms/${code}/teams/assign`, {
        userId: session.userId,
        token: session.token,
        playerId,
        teamId: teamId || null,
      });
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setAssigningId(null);
    }
  }

  return (
    <section className={`card ${styles.section}`}>
      <h3>Teams</h3>
      <p className={styles.subtitle}>Optional — only needed if you want to score by team instead of by player.</p>

      <form className={styles.addRow} onSubmit={handleCreateTeam}>
        <input
          className="text-input"
          placeholder="Add a team (e.g. Team Sharks)"
          value={teamName}
          maxLength={40}
          onChange={(e) => setTeamName(e.target.value)}
        />
        <button type="submit" className="btn btn-secondary" disabled={submitting || !teamName.trim()}>
          Add
        </button>
      </form>

      {error && <p className="error-banner">{error}</p>}

      <div className={styles.playerList}>
        {players.map((p) => (
          <div key={p.id} className={styles.playerRow}>
            <span className={styles.playerName}>
              {p.username}
              {p.isAdmin && <span className={styles.adminTag}>host</span>}
            </span>
            <select
              className={styles.select}
              value={p.teamId || ""}
              disabled={assigningId === p.id}
              onChange={(e) => handleAssign(p.id, e.target.value)}
            >
              <option value="">No team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </section>
  );
}
