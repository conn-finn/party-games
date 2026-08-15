"use client";

import { useState } from "react";
import { apiPost } from "@/lib/apiClient";
import styles from "./GamesManager.module.css";

export default function GamesManager({ code, session, games, refresh }) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleAdd(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError("");
    try {
      await apiPost(`/api/rooms/${code}/games`, {
        userId: session.userId,
        token: session.token,
        name: trimmed,
      });
      setName("");
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={`card ${styles.section}`}>
      <h3>Game list</h3>
      <p className={styles.subtitle}>Players only ever see 3 random picks from here at a time.</p>

      <form className={styles.addRow} onSubmit={handleAdd}>
        <input
          className="text-input"
          placeholder="Add a game (e.g. Spikeball)"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="btn btn-secondary" disabled={submitting || !name.trim()}>
          Add
        </button>
      </form>

      {error && <p className="error-banner">{error}</p>}

      <ul className={styles.list}>
        {games.map((g) => (
          <li key={g.id} className={styles.listItem}>
            <span>{g.name}</span>
            {g.played && <span className={styles.playedTag}>played</span>}
          </li>
        ))}
        {games.length === 0 && <li className={styles.empty}>No games yet — add one above.</li>}
      </ul>
    </section>
  );
}
