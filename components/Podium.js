"use client";

import styles from "./Podium.module.css";

// The app's one deliberate "signature" visual: an actual 3-pedestal podium
// for the top 3 players, ordered 2nd-1st-3rd left to right like a real
// awards stand, with the 1st-place pedestal tallest.
const PLACE_META = {
  0: { label: "1st", medal: "🥇", className: "first" },
  1: { label: "2nd", medal: "🥈", className: "second" },
  2: { label: "3rd", medal: "🥉", className: "third" },
};

export default function Podium({ topThree, sortLabel }) {
  if (topThree.length === 0) return null;

  // Visual order on the stand: 2nd, 1st, 3rd (skip missing places gracefully
  // if fewer than 3 players have scored).
  const order = [1, 0, 2].filter((i) => topThree[i]);

  return (
    <div className={styles.podium}>
      {order.map((i) => {
        const player = topThree[i];
        const meta = PLACE_META[i];
        return (
          <div key={player.userId} className={`${styles.pedestal} ${styles[meta.className]}`}>
            <div className={styles.medal} aria-hidden="true">
              {meta.medal}
            </div>
            <div className={styles.name}>{player.username}</div>
            {player.teamName && <div className={styles.team}>{player.teamName}</div>}
            <div className={styles.score}>{player.total}</div>
            <div className={styles.block}>
              <span className={styles.blockLabel}>{meta.label}</span>
            </div>
          </div>
        );
      })}
      <p className={styles.sortNote}>Ranked by {sortLabel}</p>
    </div>
  );
}
