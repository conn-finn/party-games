"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRoom } from "@/hooks/useRoom";
import { loadSession, clearSession } from "@/lib/clientSession";
import RoomHeader from "@/components/RoomHeader";
import BottomNav from "@/components/BottomNav";
import VoteTab from "@/components/VoteTab";
import LeaderboardTab from "@/components/LeaderboardTab";
import AdminTab from "@/components/AdminTab";
import RoomEnded from "@/components/RoomEnded";
import styles from "./RoomClient.module.css";

export default function RoomClient({ code }) {
  const router = useRouter();
  const [session, setSession] = useState(undefined); // undefined = not checked yet, null = none
  const [activeTab, setActiveTab] = useState("vote");

  useEffect(() => {
    const stored = loadSession();
    if (!stored || stored.code !== code) {
      router.replace(`/?code=${code}`);
      return;
    }
    setSession(stored);
  }, [code, router]);

  const { state, error, refresh } = useRoom(code, session);

  useEffect(() => {
    if (error && (error.status === 401 || error.status === 404)) {
      clearSession();
      router.replace(`/?code=${code}`);
    }
  }, [error, code, router]);

  if (session === undefined || (!state && !error)) {
    return (
      <div className={styles.loadingScreen}>
        <span className="spinner" />
        <span>Loading room {code}…</span>
      </div>
    );
  }

  if (!state) {
    return (
      <div className={styles.loadingScreen}>
        <span>Reconnecting…</span>
      </div>
    );
  }

  if (state.room.status === "ended") {
    return <RoomEnded code={code} />;
  }

  return (
    <div className={styles.page}>
      <RoomHeader state={state} onLeave={() => router.push("/")} />

      <div className={styles.content}>
        {activeTab === "vote" && <VoteTab code={code} session={session} state={state} refresh={refresh} />}
        {activeTab === "leaderboard" && <LeaderboardTab code={code} session={session} state={state} />}
        {activeTab === "admin" && state.isAdmin && (
          <AdminTab code={code} session={session} state={state} refresh={refresh} />
        )}
      </div>

      <BottomNav activeTab={activeTab} onChange={setActiveTab} isAdmin={state.isAdmin} />
    </div>
  );
}
