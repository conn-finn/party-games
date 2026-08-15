"use client";

import styles from "./RoomHeader.module.css";

const STATUS_LABEL = {
  lobby: "In the lobby",
  voting: "Voting now",
  in_progress: "Game on!",
};

export default function RoomHeader({ state, onLeave }) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <span className={styles.codeBadge}>{state.room.code}</span>
        <div className={styles.meta}>
          <span className={styles.status}>{STATUS_LABEL[state.room.status] || state.room.status}</span>
          <span className={styles.players}>
            {state.players.length} player{state.players.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>
      <button className={styles.leaveBtn} onClick={onLeave} aria-label="Back to start screen">
        Exit
      </button>
    </header>
  );
}
