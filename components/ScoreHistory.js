"use client";

import { useState } from "react";
import styles from "./ScoreHistory.module.css";

export default function ScoreHistory({ history }) {
  const [openId, setOpenId] = useState(null);

  if (history.length === 0) return null;

  // Most recent game first.
  const ordered = [...history].reverse();

  return (
    <div className={styles.wrap}>
      <h3 className={styles.heading}>Game history</h3>
      <div className={styles.list}>
        {ordered.map((round) => {
          const open = openId === round.roundId;
          return (
            <div key={round.roundId} className={`card ${styles.item}`}>
              <button className={styles.itemHeader} onClick={() => setOpenId(open ? null : round.roundId)}>
                <span className={styles.itemName}>{round.gameName}</span>
                <span className={styles.chevron} aria-hidden="true">
                  {open ? "▲" : "▼"}
                </span>
              </button>
              {open && (
                <div className={styles.entries}>
                  {round.entries.map((e, i) => (
                    <div key={`${e.name}-${i}`} className={styles.entryRow}>
                      <span>{e.name}</span>
                      <span className={styles.entryPoints}>{e.points}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
