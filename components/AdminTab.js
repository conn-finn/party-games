"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/apiClient";
import { clearSession } from "@/lib/clientSession";
import RoundControl from "@/components/admin/RoundControl";
import GamesManager from "@/components/admin/GamesManager";
import TeamsManager from "@/components/admin/TeamsManager";
import styles from "./AdminTab.module.css";

export default function AdminTab({ code, session, state, refresh }) {
  const router = useRouter();
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState("");

  async function handleEndRoom() {
    setEnding(true);
    setError("");
    try {
      await apiPost(`/api/rooms/${code}/end`, { userId: session.userId, token: session.token });
      clearSession();
      router.push("/");
    } catch (err) {
      setError(err.message);
      setEnding(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <RoundControl code={code} session={session} state={state} refresh={refresh} />
      <GamesManager code={code} session={session} games={state.adminGameOptions || []} refresh={refresh} />
      <TeamsManager code={code} session={session} teams={state.teams} players={state.players} refresh={refresh} />

      <section className={`card ${styles.dangerSection}`}>
        <h3>End this room</h3>
        <p className={styles.subtitle}>
          Rooms stay open until you end them — even between game nights. This can't be undone.
        </p>
        {error && <p className="error-banner">{error}</p>}
        {!confirmingEnd ? (
          <button className="btn btn-danger btn-block" onClick={() => setConfirmingEnd(true)}>
            End room
          </button>
        ) : (
          <div className={styles.confirmRow}>
            <button className="btn btn-ghost" onClick={() => setConfirmingEnd(false)} disabled={ending}>
              Cancel
            </button>
            <button className="btn btn-danger" onClick={handleEndRoom} disabled={ending}>
              {ending ? <span className="spinner" /> : "Yes, end it for everyone"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
