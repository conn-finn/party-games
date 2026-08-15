"use client";

import useSWR from "swr";
import { apiGet } from "@/lib/apiClient";

const POLL_INTERVAL_MS = 4000;

// Only polls while the caller actually wants it (pass active=false to pause
// when the Leaderboard tab isn't visible, saving a few requests/minute).
export function useLeaderboard(code, session, sort, active) {
  const key =
    code && session && active
      ? `/api/rooms/${code}/leaderboard?userId=${session.userId}&token=${session.token}&sort=${sort}`
      : null;

  const { data, error, isLoading } = useSWR(key, apiGet, {
    refreshInterval: POLL_INTERVAL_MS,
    dedupingInterval: 1000,
  });

  return { data, error, isLoading };
}
