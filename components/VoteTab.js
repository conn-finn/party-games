"use client";

import { useEffect, useRef, useState } from "react";
import { apiPost } from "@/lib/apiClient";
import { fireConfetti } from "@/lib/confetti";
import styles from "./VoteTab.module.css";

const OPTION_COLORS = ["var(--gold)", "var(--pink)", "var(--sky)"];

export default function VoteTab({ code, session, state, refresh }) {
  const { round, isAdmin, players } = state;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const celebratedRoundId = useRef(null);

  useEffect(() => {
    if (round?.status === "in_progress" && celebratedRoundId.current !== round.id) {
      celebratedRoundId.current = round.id;
      fireConfetti();
    }
  }, [round?.status, round?.id]);

  if (!round) {
    return (
      <EmptyState
        emoji="🎲"
        title="No vote right now"
        subtitle={isAdmin ? "Head to the Admin tab to start the next vote." : "Waiting for the host to start the next vote."}
      />
    );
  }

  if (round.status === "in_progress") {
    return (
      <div className={`card ${styles.playingCard}`}>
        <div className={styles.playingEmoji} aria-hidden="true">
          🎮
        </div>
        <p className={styles.nowPlayingLabel}>Now playing</p>
        <h2 className={styles.gameName}>{round.winningGameName}</h2>
        <p className={styles.playingSubtitle}>
          {isAdmin
            ? "Go play! Enter scores in the Admin tab when you're done."
            : "Go play! The host will enter scores when you're done."}
        </p>
      </div>
    );
  }

  async function castVote(gameOptionId) {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await apiPost(`/api/rooms/${code}/round/vote`, {
        userId: session.userId,
        token: session.token,
        gameOptionId,
      });
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  const votedCount = round.totalVotes ?? 0;
  const totalPlayers = players.length;
  const progressPct = totalPlayers ? Math.round((votedCount / totalPlayers) * 100) : 0;

  return (
    <div className={styles.wrap}>
      <div className={styles.intro}>
        <h2>What should we play next?</h2>
        <p>Tap a game to vote. You can change your mind until voting closes.</p>
      </div>

      <div className={styles.options}>
        {round.options.map((opt, i) => {
          const selected = round.myVoteGameOptionId === opt.gameOptionId;
          return (
            <button
              key={opt.id}
              className={`${styles.option} ${selected ? styles.selected : ""}`}
              style={{ "--option-color": OPTION_COLORS[i % OPTION_COLORS.length] }}
              onClick={() => castVote(opt.gameOptionId)}
              disabled={pending}
            >
              <span className={styles.optionName}>{opt.name}</span>
              {selected && (
                <span className={styles.check} aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error && <p className="error-banner">{error}</p>}

      <div className={styles.progressWrap}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
        </div>
        <p className={styles.progressLabel}>
          {votedCount} of {totalPlayers} player{totalPlayers === 1 ? "" : "s"} voted
        </p>
      </div>

      {isAdmin && round.tally && (
        <div className={`card ${styles.tallyCard}`}>
          <p className={styles.tallyTitle}>Live tally (only you can see this)</p>
          {round.options.map((opt, i) => {
            const count = round.tally[opt.gameOptionId] || 0;
            const pct = votedCount ? Math.round((count / votedCount) * 100) : 0;
            return (
              <div key={opt.id} className={styles.tallyRow}>
                <span className={styles.tallyName}>{opt.name}</span>
                <div className={styles.tallyBarTrack}>
                  <div
                    className={styles.tallyBarFill}
                    style={{ width: `${pct}%`, background: OPTION_COLORS[i % OPTION_COLORS.length] }}
                  />
                </div>
                <span className={styles.tallyCount}>{count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState({ emoji, title, subtitle }) {
  return (
    <div className={`card ${styles.emptyCard}`}>
      <div className={styles.emptyEmoji} aria-hidden="true">
        {emoji}
      </div>
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  );
}
