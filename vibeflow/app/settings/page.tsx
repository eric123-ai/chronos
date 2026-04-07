"use client";

import { useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { readValue } from "../../lib/storage";
import { migrateLocalToCloud } from "../../lib/cloudSync";

const KEYS = [
  "vibeflow.courses.v1",
  "vibeflow.rewards.v1",
  "vibeflow.walletPoints.v1",
  "vibeflow.tasks.v1",
  "chronos.goals.v1",
  "chronos.recurrence-rules.v1",
  "vibeflow.history.v1",
  "vibeflow_summaries",
];

function NotifyControls() {
  const [perm, setPerm] = useState<NotificationPermission>("default");
  useEffect(() => { if (typeof window !== 'undefined') setPerm(Notification.permission); }, []);
  async function request() {
    try { const p = await Notification.requestPermission(); setPerm(p); } catch {}
  }
  async function test() {
    try { const reg = await navigator.serviceWorker.getRegistration(); reg?.active?.postMessage({ type: 'SHOW_NOTIFICATION', title: '测试提醒', body: '这是一条测试通知。' }); } catch {}
  }
  function toggleGlobal(enable: boolean) {
    try { localStorage.setItem('chronos.notifications.enabled', enable ? '1' : '0'); } catch {}
  }
  return (
    <div className="mt-2">
      <div className="text-sm text-[var(--vf-text-muted)]">权限：{perm}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={request} className="chronos-button-secondary rounded-full px-4 py-2 text-sm font-medium">申请权限</button>
        <button type="button" onClick={test} className="chronos-button-secondary rounded-full px-4 py-2 text-sm font-medium">测试通知</button>
        <button type="button" onClick={() => toggleGlobal(true)} className="chronos-button-secondary rounded-full px-4 py-2 text-sm font-medium">开启全局</button>
        <button type="button" onClick={() => toggleGlobal(false)} className="chronos-button-secondary rounded-full px-4 py-2 text-sm font-medium">关闭全局</button>
      </div>
    </div>
  );
}

function ShareControls() {
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window !== 'undefined' ? window.location.origin + '/share/new' : '';
  async function copy() { try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch {} }
  return (
    <div className="mt-2">
      <div className="text-sm text-[var(--vf-text-muted)]">生成只读分享链接（示例）。后续将绑定实际清单，并设置权限。</div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="rounded-xl border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] px-2 py-1 text-xs">{shareUrl}</code>
        <button type="button" onClick={copy} className="chronos-button-secondary rounded-full px-3 py-2 text-xs font-medium">{copied ? '已复制' : '复制链接'}</button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const session = useSession();
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string>("");

  function exportJson() {
    setDownloading(true);
    try {
      const payload: Record<string, unknown> = { version: "1" };
      for (const key of KEYS) payload[key] = JSON.parse(readValue(key) || "null");
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chronos-backup-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMessage("已导出 JSON 备份");
    } finally {
      setDownloading(false);
    }
  }

  async function importJsonFile(file: File) {
    try {
      setUploading(true);
      setMessage("");
      const text = await file.text();
      const res = await fetch("/api/import/local-json", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: text,
      });
      if (!res.ok) throw new Error("import-failed");
      setMessage("已导入到云端（Neon）");
    } catch {
      setMessage("导入失败，请检查文件或登录状态");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="panel-profile min-h-screen w-full text-[var(--vf-text)]">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="glass-surface rounded-[32px] p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">设置 / Settings</div>
              <div className="mt-1 text-sm text-[var(--vf-text-muted)]">账号与数据</div>
            </div>
            <div className="text-xs text-[var(--vf-text-muted)]">
              {session.status === "authenticated" ? session.data.user?.email : "未登录 / Signed out"}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4">
          <div className="glass-surface rounded-[32px] p-5">
            <div className="text-sm font-semibold">账号</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {session.status === "authenticated" ? (
                <button onClick={() => signOut()} className="chronos-button-secondary rounded-full px-4 py-2 text-sm font-medium">退出登录</button>
              ) : (
                <button onClick={() => signIn()} className="chronos-button-secondary rounded-full px-4 py-2 text-sm font-medium">登录（开发：凭据）</button>
              )}
            </div>
          </div>

          <div className="glass-surface rounded-[32px] p-5">
            <div className="text-sm font-semibold">通知与提醒</div>
            <NotifyControls />
          </div>

          <div className="glass-surface rounded-[32px] p-5">
            <div className="text-sm font-semibold">数据备份</div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button disabled={downloading} onClick={exportJson} className="chronos-button-secondary rounded-full px-4 py-2 text-sm font-medium">
                导出本地 JSON
              </button>
              {session.status === "authenticated" ? (
                <>
                  <button onClick={() => void migrateLocalToCloud()} className="chronos-button-secondary rounded-full px-4 py-2 text-sm font-medium">
                    一键迁移到云
                  </button>
                  <label className="inline-flex items-center gap-2 rounded-full border border-[rgba(45,35,25,0.08)] bg-[rgba(255,251,245,0.96)] px-4 py-2 text-sm">
                    <input type="file" accept="application/json" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importJsonFile(f); e.currentTarget.value = ""; }} disabled={uploading} />
                    选择 JSON 导入
                  </label>
                </>
              ) : null}
              {message ? <span className="text-xs text-[var(--vf-text-muted)]">{message}</span> : null}
            </div>
          </div>

          <div className="glass-surface rounded-[32px] p-5">
            <div className="text-sm font-semibold">共享与协作</div>
            <ShareControls />
          </div>
        </div>
      </div>
    </div>
  );
}
