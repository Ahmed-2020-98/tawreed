'use client';

import type { SeriesPoint } from '@tawreed/contracts';
import { cn } from '@tawreed/ui';
import { useId, useState } from 'react';
import { useFormat } from '@/lib/hooks/use-format';

/** SVG area chart with hover readout (money series, optional order counts). */
export function AreaChart({ data, height = 220, color = '#0A9B69' }: { data: SeriesPoint[]; height?: number; color?: string }) {
  const f = useFormat();
  const gid = useId();
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = height;
  const P = 10;
  const values = data.map((d) => Number(d.value));
  const max = Math.max(1, ...values);
  const x = (i: number) => P + (i * (W - 2 * P)) / Math.max(1, data.length - 1);
  const y = (v: number) => H - P - (v / max) * (H - 2 * P - 18);
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(Number(d.value)).toFixed(1)}`).join(' ');
  const area = `${line} L${x(data.length - 1)},${H - P} L${x(0)},${H - P} Z`;
  const h = hover != null ? data[hover] : null;
  if (!data.length) return null;
  return (
    <div className="relative" dir="ltr">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }} preserveAspectRatio="none" onMouseLeave={() => setHover(null)} role="img" aria-label="Chart">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.26" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1={P} x2={W - P} y1={H * g} y2={H * g} stroke="#EBEEF2" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
        ))}
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {data.map((d, i) => (
          <rect key={d.date} x={x(i) - W / data.length / 2} y={0} width={W / data.length} height={H} fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={P} y2={H - P} stroke={color} strokeOpacity="0.35" vectorEffect="non-scaling-stroke" />}
      </svg>
      {h && (
        <div className="pointer-events-none absolute top-1 z-10 rounded-lg bg-navy-950 px-3 py-2 text-xs text-white shadow-lg" style={{ left: `${(x(hover!) / W) * 100}%`, transform: `translateX(${hover! > data.length / 2 ? '-105%' : '5%'})` }}>
          <p className="num text-sm font-bold">{f.money(h.value)}</p>
          <p className="opacity-70">
            {f.date(h.date)}
            {h.count != null && ` · ${h.count}`}
          </p>
        </div>
      )}
    </div>
  );
}

/** Horizontal bars ranked by value. */
export function BarList({ items, money = true, color = 'bg-brand-500' }: { items: { label: React.ReactNode; value: number | string; sub?: React.ReactNode }[]; money?: boolean; color?: string }) {
  const f = useFormat();
  const max = Math.max(1, ...items.map((i) => Number(i.value)));
  return (
    <ul className="space-y-3.5">
      {items.map((i, idx) => (
        <li key={idx}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-semibold text-gray-800">{i.label}</span>
            <span className="num shrink-0 font-bold text-gray-900">
              {money ? f.money(i.value) : i.value}
              {i.sub && <span className="ms-1.5 text-xs font-medium text-gray-400">{i.sub}</span>}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div className={cn('h-full rounded-full', color)} style={{ width: `${Math.max(3, (Number(i.value) / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

const DONUT_COLORS = ['#0A9B69', '#0B2D5B', '#3CC390', '#F59E0B', '#6366F1', '#94A3B8'];

/** Donut with legend (e.g. payment mix). */
export function Donut({ items, centerLabel }: { items: { label: React.ReactNode; value: number }[]; centerLabel?: React.ReactNode }) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  const R = 42;
  const C = 2 * Math.PI * R;
  const lens = items.map((i) => (i.value / total) * C);
  const offsets = lens.map((_, idx) => lens.slice(0, idx).reduce((a, b) => a + b, 0));
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative size-36 shrink-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90">
          <circle cx="50" cy="50" r={R} fill="none" stroke="#EEF1F4" strokeWidth="12" />
          {items.map((_, idx) => (
            <circle key={idx} cx="50" cy="50" r={R} fill="none" stroke={DONUT_COLORS[idx % DONUT_COLORS.length]} strokeWidth="12" strokeDasharray={`${lens[idx]} ${C - lens[idx]!}`} strokeDashoffset={-offsets[idx]!} />
          ))}
        </svg>
        {centerLabel && <div className="absolute inset-0 grid place-items-center text-center">{centerLabel}</div>}
      </div>
      <ul className="min-w-40 flex-1 space-y-2.5">
        {items.map((i, idx) => (
          <li key={idx} className="flex items-center gap-2.5 text-sm">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: DONUT_COLORS[idx % DONUT_COLORS.length] }} />
            <span className="flex-1 font-semibold text-gray-700">{i.label}</span>
            <span className="num font-bold text-gray-900">{Math.round((i.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
