'use client';

import type { SeriesPoint } from '@tawreed/contracts';
import { useState } from 'react';
import { useFormat } from '@/lib/hooks/use-format';

/** Lightweight SVG area chart (no chart lib) with hover readout. */
export function SpendChart({ data }: { data: SeriesPoint[] }) {
  const f = useFormat();
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = 180;
  const P = 8;
  const values = data.map((d) => Number(d.value));
  const max = Math.max(1, ...values);
  const x = (i: number) => P + (i * (W - 2 * P)) / Math.max(1, data.length - 1);
  const y = (v: number) => H - P - (v / max) * (H - 2 * P - 16);
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(Number(d.value)).toFixed(1)}`).join(' ');
  const area = `${line} L${x(data.length - 1)},${H - P} L${x(0)},${H - P} Z`;
  const h = hover != null ? data[hover] : null;
  return (
    <div className="relative" dir="ltr">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-48 w-full" onMouseLeave={() => setHover(null)} role="img" aria-label="Spend chart">
        <defs>
          <linearGradient id="spend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0A9B69" stopOpacity="0.28" />
            <stop offset="1" stopColor="#0A9B69" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1={P} x2={W - P} y1={H * g} y2={H * g} stroke="#EBEEF2" strokeDasharray="4 4" />
        ))}
        <path d={area} fill="url(#spend)" />
        <path d={line} fill="none" stroke="#0A9B69" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <rect key={d.date} x={x(i) - (W / data.length) / 2} y={0} width={W / data.length} height={H} fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
        {hover != null && <circle cx={x(hover)} cy={y(values[hover]!)} r="5" fill="#fff" stroke="#067A5B" strokeWidth="3" />}
      </svg>
      {h && (
        <div className="pointer-events-none absolute top-0 rounded-lg bg-navy-950 px-2.5 py-1.5 text-xs text-white shadow-lg" style={{ left: `${(x(hover!) / W) * 100}%`, transform: 'translateX(-50%)' }}>
          <p className="num font-bold">{f.money(h.value)}</p>
          <p className="opacity-70">{f.date(h.date)}</p>
        </div>
      )}
    </div>
  );
}
