"use client";

import { useEffect, useState } from "react";
import type { Me } from "./types";

let cache: Me | null = null;

export function useMe() {
  const [me, setMe] = useState<Me | null>(cache);
  useEffect(() => {
    let live = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!live) return;
        if (d.me) {
          cache = d.me;
          setMe(d.me);
        } else {
          cache = null;
          location.href = "/login?next=" + encodeURIComponent(location.pathname);
        }
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return me;
}

export async function logout() {
  cache = null;
  await fetch("/api/auth/logout", { method: "POST" });
  location.href = "/login";
}
