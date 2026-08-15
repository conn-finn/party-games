"use client";

import useSWR from "swr";
import { apiGet } from "@/lib/apiClient";

// Polling, not websockets, is the "live update" mechanism for the whole
// app — see README.md for why that's the right tradeoff at this scale
// (< 50 concurrent players). 3 seconds keeps votes/scores feeling prompt
// without hammering the free-tier database.
const POLL_INTERVAL_MS = 3000;

export function useRoom(code, session) {
  const key = code && session ? `/api/rooms/${code}/state?userId=${session.userId}&token=${session.token}` : null;

  const { data, error, isLoading, mutate } = useSWR(key, apiGet, {
    refreshInterval: POLL_INTERVAL_MS,
    revalidateOnFocus: true,
    dedupingInterval: 1000,
  });

  return { state: data, error, isLoading, refresh: mutate };
}
