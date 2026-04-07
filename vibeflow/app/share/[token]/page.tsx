"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function SharePage({ params }: { params: { token: string } }) {
  const { token } = params;
  const [items, setItems] = useState<Array<{ name: string; estimatedMinutes: number; plannedDate?: string }>>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/share/${token}`);
        if (!res.ok) return;
        const data = await res.json();
        setItems(Array.isArray(data?.items) ? data.items : []);
      } catch {}
    })();
  }, [token]);

  return (
    <div className="panel-profile min-h-screen w-full text-[var(--vf-text)]">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <header className="glass-surface rounded-[32px] px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-amber-200">/share/{token.slice(0,6)}…</div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">只读清单</h1>
            </div>
            <Link href="/" className="rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-amber-400">返回</Link>
          </div>
        </header>

        <section className="glass-surface mt-4 rounded-[32px] p-5">
          <div className="text-sm font-semibold">任务</div>
          <div className="mt-3 space-y-2">
            {items.map((t, i) => (
              <div key={i} className="rounded-2xl border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-[var(--vf-text)]">{t.name}</div>
                    <div className="mt-1 text-xs text-[var(--vf-text-muted)]">{t.estimatedMinutes} min{t.plannedDate ? ` · ${t.plannedDate}` : ""}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
