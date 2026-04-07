"use client";

import React from "react";

export type PieSegment = { label: string; value: number; color: string };

export function PieChart({
  size = 120,
  stroke = 22,
  segments,
  legend = true,
}: {
  size?: number;
  stroke?: number;
  segments: PieSegment[];
  legend?: boolean;
}) {
  const total = Math.max(0, segments.reduce((s, x) => s + Math.max(0, x.value), 0));
  const r = Math.max(1, Math.floor(size / 2 - stroke / 2));
  const center = Math.floor(size / 2);

  let acc = 0; // cumulative percentage
  const rings = total > 0
    ? segments.map((seg) => {
        const pct = Math.max(0, (seg.value / total) * 100);
        const item = { pct, offset: acc, color: seg.color, label: seg.label, value: seg.value };
        acc += pct;
        return item;
      })
    : [];

  return (
    <div className="flex items-start gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        {/* background ring */}
        <circle cx={center} cy={center} r={r} fill="transparent" stroke="rgba(0,0,0,0.06)" strokeWidth={stroke} />
        <g transform={`rotate(-90 ${center} ${center})`}>
          {rings.map((seg, idx) => (
            <circle
              key={`${seg.label}-${idx}`}
              cx={center}
              cy={center}
              r={r}
              fill="transparent"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeLinecap="butt"
              strokeDasharray={`${seg.pct} ${100 - seg.pct}`}
              strokeDashoffset={100 - seg.offset}
            />
          ))}
        </g>
      </svg>
      {legend ? (
        <div className="grid gap-2 text-sm">
          {segments.map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
              <span>{s.label}</span>
              <span className="font-precision text-[11px] text-[var(--vf-text-soft)]">{s.value}</span>
            </div>
          ))}
          {total === 0 ? <div className="text-[var(--vf-text-muted)]">无完成任务</div> : null}
        </div>
      ) : null}
    </div>
  );
}
