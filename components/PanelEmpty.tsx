"use client";

/**
 * The empty state, before a chart is loaded.
 *
 * A large, very low-contrast mark behind a short line - the kind of watermark a
 * printed ephemeris or a title page carries. It has to sit far enough back that
 * it never competes with a loaded chart, so everything is drawn at low opacity
 * in the hairline colour rather than in an accent.
 *
 * Each panel gets a different mark, because three identical empty states read as
 * one broken screen rather than three panels waiting.
 */

type Mark = "chart" | "wheel" | "list";

/** The north Indian diamond, reduced to its rules. */
function ChartMark() {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="0.6"
    >
      <rect x="2" y="2" width="96" height="96" />
      <path d="M2 2 L98 98 M98 2 L2 98" />
      <path d="M50 2 L2 50 L50 98 L98 50 Z" />
    </svg>
  );
}

/** Twelve spokes and two rings - the zodiac as a dial. */
function WheelMark() {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="0.6"
    >
      <circle cx="50" cy="50" r="47" />
      <circle cx="50" cy="50" r="31" />
      <circle cx="50" cy="50" r="8" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 * Math.PI) / 180;
        return (
          <line
            key={i}
            x1={50 + 31 * Math.cos(a)}
            y1={50 + 31 * Math.sin(a)}
            x2={50 + 47 * Math.cos(a)}
            y2={50 + 47 * Math.sin(a)}
          />
        );
      })}
    </svg>
  );
}

/** Ruled lines, as on a page waiting to be written on. */
function ListMark() {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="0.6"
    >
      <rect x="10" y="6" width="80" height="88" rx="2" />
      {Array.from({ length: 9 }, (_, i) => (
        <g key={i}>
          <circle cx="20" cy={18 + i * 9} r="1.6" />
          <line
            x1="27"
            y1={18 + i * 9}
            x2={i % 3 === 2 ? 66 : 80}
            y2={18 + i * 9}
          />
        </g>
      ))}
    </svg>
  );
}

const MARKS: Record<Mark, () => React.ReactElement> = {
  chart: ChartMark,
  wheel: WheelMark,
  list: ListMark,
};

export function PanelEmpty({
  mark,
  title,
  line,
}: {
  mark: Mark;
  title: string;
  line: string;
}) {
  const Drawn = MARKS[mark];

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden p-6">
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden
      >
        {/* Sized off the smaller dimension so it never crops when a panel is
            dragged narrow, and clipped by the parent when it would. */}
        <div className="aspect-square w-[min(78%,320px)] text-[rgb(var(--hairline))] opacity-40">
          <Drawn />
          <div className="relative m-auto pt-4 max-w-[30ch] text-center">
            <p className="text-[rgb(var(--muted))] text-[10px] font-bold mb-1.5">
              {title}
            </p>
            <p className="text-[rgb(var(--muted))]">{line}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
