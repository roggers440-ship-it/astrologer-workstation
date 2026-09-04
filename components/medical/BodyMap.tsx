'use client';

import type { RegionId, Severity } from '@/lib/medical';

/**
 * Front and back figures, drawn as anatomy rather than boxes.
 *
 * Each region is its own path shaped to the structure it represents, laid over a
 * neutral silhouette.
 *
 * Colour carries severity, opacity carries agreement - the two are separate
 * signals and shouldn't be collapsed. Red appears in practitioner view only. A
 * red organ on a screen turned toward a client reads as a medical finding, and
 * that is a claim neither the chart nor the astrologer can stand behind.
 */

const SEVERITY_COLOUR: Record<Severity, string> = {
  Priority: 'rgb(var(--vermilion))',
  Watch: 'rgb(var(--brass))',
  Background: 'rgb(var(--muted))',
};

const SILHOUETTE = {
  head: 'M100 10c14 0 25 12 25 28 0 12-5 23-12 29v9c0 6 8 10 17 13H70c9-3 17-7 17-13v-9c-7-6-12-17-12-29 0-16 11-28 25-28z',
  torso: 'M74 90c-14 5-24 13-28 26-4 14-6 32-6 52 0 13 2 23 4 32 2 13 3 26 5 38 2 14 5 23 9 31h84c4-8 7-17 9-31 2-12 3-25 5-38 2-9 4-19 4-32 0-20-2-38-6-52-4-13-14-21-28-26z',
  armR: 'M47 114c-9 6-14 19-16 37-2 20-4 42-6 62-1 12-3 24-4 34-1 9 2 16 8 15 5-1 7-7 8-16 2-14 4-33 7-51 2-14 5-29 7-45 2-14 2-28-4-36z',
  armL: 'M153 114c9 6 14 19 16 37 2 20 4 42 6 62 1 12 3 24 4 34 1 9-2 16-8 15-5-1-7-7-8-16-2-14-4-33-7-51-2-14-5-29-7-45-2-14-2-28 4-36z',
  legR: 'M58 269c-3 21-2 45 0 67 2 24 5 47 8 69 2 18 4 35 5 51 1 12 1 23 0 31h19c1-8 1-19 0-31-1-22-2-45-1-68 1-23 4-46 7-67 2-16 3-34 3-52z',
  legL: 'M142 269c3 21 2 45 0 67-2 24-5 47-8 69-2 18-4 35-5 51-1 12-1 23 0 31h-19c-1-8-1-19 0-31 1-22 2-45 1-68-1-23-4-46-7-67-2-16-3-34-3-52z',
  footR: 'M71 487h19c1 6 2 11 0 15-3 4-16 5-26 4-7-1-9-6-6-10 3-5 9-8 13-9z',
  footL: 'M129 487h-19c-1 6-2 11 0 15 3 4 16 5 26 4 7-1 9-6 6-10-3-5-9-8-13-9z',
};

type Shape = { d: string } | { cx: number; cy: number; rx: number; ry: number };

const FRONT_REGIONS: Partial<Record<RegionId, Shape[]>> = {
  head: [{ d: 'M100 10c14 0 25 12 25 28 0 7-1 13-4 19H79c-3-6-4-12-4-19 0-16 11-28 25-28z' }],
  face: [{ d: 'M79 57h42c-3 9-8 15-11 18v5H90v-5c-3-3-8-9-11-18z' }],
  throat: [{ d: 'M88 76h24v14c0 6 8 10 15 13H73c7-3 15-7 15-13z' }],
  arms: [{ d: SILHOUETTE.armR }, { d: SILHOUETTE.armL }],
  chest: [{ d: 'M58 96c-8 6-12 14-14 26-2 14-3 28-2 41h116c1-13 0-27-2-41-2-12-6-20-14-26z' }],
  heart: [{ cx: 112, cy: 133, rx: 17, ry: 19 }],
  stomach: [{ d: 'M42 163h116c0 12-1 23-3 32H45c-2-9-3-20-3-32z' }],
  liver: [{ cx: 70, cy: 178, rx: 24, ry: 15 }],
  intestines: [{ d: 'M45 195h110c-1 15-3 29-5 41H50c-2-12-4-26-5-41z' }],
  pelvis: [{ d: 'M50 236h100c-1 12-3 23-5 33H55c-2-10-4-21-5-33z' }],
  knees: [{ cx: 88, cy: 402, rx: 17, ry: 15 }, { cx: 112, cy: 402, rx: 17, ry: 15 }],
  feet: [{ d: SILHOUETTE.footR }, { d: SILHOUETTE.footL }],
};

const BACK_REGIONS: Partial<Record<RegionId, Shape[]>> = {
  cervical: [{ d: 'M87 74h26v32H87z' }],
  thoracic: [{ d: 'M90 106h20v84H90z' }],
  kidneys: [{ cx: 74, cy: 200, rx: 15, ry: 21 }, { cx: 126, cy: 200, rx: 15, ry: 21 }],
  lumbar: [{ d: 'M84 215h32c2 20 2 40-2 54H86c-4-14-4-34-2-54z' }],
};

function Shapes({ shapes, ...rest }: { shapes: Shape[] } & React.SVGProps<any>) {
  return (
    <>
      {shapes.map((s, i) =>
        'd' in s ? <path key={i} d={s.d} {...rest} /> : <ellipse key={i} {...s} {...rest} />,
      )}
    </>
  );
}

function Figure({
  regions,
  intensity,
  severity,
  clientView,
  selected,
  onSelect,
  labels,
}: {
  regions: Partial<Record<RegionId, Shape[]>>;
  intensity: Record<string, number>;
  severity: Record<string, Severity>;
  clientView: boolean;
  selected: RegionId | null;
  onSelect: (id: RegionId) => void;
  labels: Record<string, string>;
}) {
  return (
    <g>
      <g fill="rgb(var(--hairline))" fillOpacity={0.55} stroke="rgb(var(--muted))" strokeWidth={0.6}>
        {Object.values(SILHOUETTE).map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>

      {(Object.keys(regions) as RegionId[]).map((id) => {
        const value = intensity[id];
        if (!value) return null;
        const isSelected = selected === id;

        const band = severity[id] ?? 'Background';
        const colour = clientView ? 'rgb(var(--brass))' : SEVERITY_COLOUR[band];
        const emphasis = band === 'Priority' ? 0.34 : band === 'Watch' ? 0.2 : 0.1;

        return (
          <g
            key={id}
            role="button"
            tabIndex={0}
            aria-label={labels[id] ?? id}
            className="cursor-pointer outline-none"
            onClick={() => onSelect(id)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(id)}
          >
            <Shapes
              shapes={regions[id]!}
              fill={colour}
              fillOpacity={emphasis + value * 0.4}
              stroke={colour}
              strokeWidth={isSelected ? 2.2 : band === 'Priority' ? 1.4 : 0.9}
              strokeOpacity={isSelected ? 1 : 0.8}
            />
          </g>
        );
      })}
    </g>
  );
}

export function BodyMap({
  intensity,
  severity,
  clientView,
  labels,
  selected,
  onSelect,
  className,
}: {
  intensity: Record<string, number>;
  severity: Record<string, Severity>;
  clientView: boolean;
  labels: Record<string, string>;
  selected: RegionId | null;
  onSelect: (id: RegionId) => void;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 440 530" className={className ?? 'w-full'} role="img" aria-label="Body regions flagged by the chart">
      <g transform="translate(5,8)">
        <Figure regions={FRONT_REGIONS} intensity={intensity} severity={severity} clientView={clientView} selected={selected} onSelect={onSelect} labels={labels} />
        <text x="100" y="522" textAnchor="middle" fontFamily="var(--font-data)" fontSize={10} fill="rgb(var(--muted))">
          FRONT
        </text>
      </g>

      <g transform="translate(235,8)">
        <Figure regions={BACK_REGIONS} intensity={intensity} severity={severity} clientView={clientView} selected={selected} onSelect={onSelect} labels={labels} />
        <line x1="100" y1="80" x2="100" y2="270" stroke="rgb(var(--muted))" strokeWidth={1.2} strokeOpacity={0.5} />
        <text x="100" y="522" textAnchor="middle" fontFamily="var(--font-data)" fontSize={10} fill="rgb(var(--muted))">
          BACK
        </text>
      </g>
    </svg>
  );
}
