"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { backgroundSync } from "../lib/cloudSync";

export default function SyncBootstrap() {
  const session = useSession();

  useEffect(() => {
    if (session.status !== "authenticated") return;
    const key = "chronos.sync.bootstrapped";
    const done = sessionStorage.getItem(key);
    if (done) return;
    void backgroundSync().finally(() => {
      sessionStorage.setItem(key, "1");
    });
  }, [session.status]);

  return null;
}
