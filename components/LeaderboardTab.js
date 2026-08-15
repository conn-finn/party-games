"use client";

import { useEffect, useRef, useState } from "react";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { fireBigConfetti } from "@/lib/confetti";
import Podium from "@/components/Podium";
import LeaderboardChart from "@/components/LeaderboardChart";
import ScoreHistory from "@/components/ScoreHistory";
import styles from "./LeaderboardTab.module.css";

export default function LeaderboardTab({ code, session }) {
  const [sort, setSort] = useState("desc");
  const { data, isLoading } = useLeaderboard(code, session, sort, true);
  const celebratedLeaderId = useRef(null);

  const standings = data?.standings || [];
  const history = data?.history || [];
  const hasScores = history.length > 0;

  useEffect(() => {
    if (!hasScores || standings.length === 0) return;
    const leaderId = standings[0].userId;
    if (celebratedLeaderId.current !== null && celebratedLeaderId.current !== leaderId) {
      fireBigConfetti();
    }
    celebratedLeaderId.current = leaderId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [standings[0]?.userId, hasScores]);

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h2>Leaderboard</h2>
        <div className="pill-toggle">
          <button className={sort === "desc" ? "active" : ""} onClick={() => setSort("desc")}>
            Highest score
          </button>
          <button className={sort === "asc" ? "active" : ""} onClick={() => setSort("asc")}>
            Lowest score
          </button>
        </div>
      </div>

      {!isLoading && !hasScores && (
        <div className={`card ${styles.emptyCard}`}>
          <div className={styles.emptyEmoji} aria-hidden="true">
            📊
          </div>
          <h3>No scores yet</h3>
          <p>Play a game and have the host enter scores to see the board light up.</p>
        </div>
      )}

      {hasScores && (
        <>
          <div className={`card ${styles.podiumCard}`}>
            <Podium topThree={standings.slice(0, 3)} sortLabel={sort === "desc" ? "highest score" : "lowest score"} />
          </div>

          <div className={`card ${styles.chartCard}`}>
            <LeaderboardChart standings={standings} />
          </div>

          <div className={styles.fullList}>
            {standings.map((s) => (
              <div key={s.userId} className={styles.listRow}>
                <span className={styles.rank}>#{s.rank}</span>
                <span className={styles.rowName}>
                  {s.username}
                  {s.teamName && <span className={styles.rowTeam}> · {s.teamName}</span>}
                </span>
                <span className={styles.rowTotal}>{s.total}</span>
              </div>
            ))}
          </div>

          <ScoreHistory history={history} />
        </>
      )}
    </div>
  );
}
