"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DbState, Me, PublicStaff } from "./types";

export type AppState = Omit<DbState, "staff" | "authSecret"> & {
  staff: PublicStaff[];
  me: Me;
  storageMode?: string;
  voice?: { agentId: boolean; apiKey: boolean; voiceKey: boolean; webhookSecret: boolean; claude: boolean } | null;
};

export async function api<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  if (res.status === 401 && typeof window !== "undefined" && !location.pathname.startsWith("/login")) {
    location.href = "/login?next=" + encodeURIComponent(location.pathname);
  }
  return (await res.json()) as T;
}

/** Serverdagi holatni o'qiydi va har `ms` da yangilab turadi. */
export function useStore(ms = 2500) {
  const [state, setState] = useState<AppState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const s = await api<AppState>("/api/state");
      if ((s as unknown as { error?: string }).error) throw new Error("auth");
      setState(s);
      setError(null);
    } catch {
      setError("Server bilan aloqa yo'q");
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    refresh();
    if (!ms) return;
    const id = setInterval(refresh, ms);
    return () => clearInterval(id);
  }, [refresh, ms]);

  return { state, setState, refresh, error };
}
