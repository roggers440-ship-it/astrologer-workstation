"use client";

import { useMemo } from "react";
import type {
  ChartData,
  HouseNumber,
  PlanetName,
  PlanetPlacement,
} from "@/types/astrology";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DEBILITATION,
  EXALTATION,
  dignityOf,
  housesRuledBy,
  PLANET_ABBR,
  signIndex,
} from "@/lib/vedic-constants";
import { functionalNature } from "@/lib/native-profile";
import { ordinal } from "@/lib/rule-engine";
/** Only what the ring needs. Keeps this component free of the dasha engine. */
export interface RingPeriod {
  maha: { lord: string };
  antar?: { lord: string };
  mahaProgress: number;
}

/**
 * North Indian (diamond) chart.
 *
 * Houses are fixed in place - the ascendant moves through them, which is the whole
 * point of the format. The geometry below is the square, both diagonals, and the
 * rhombus joining the midpoints of the sides; those five lines cut the square into
 * exactly twelve cells. House 1 is the top centre kite, and the count runs
 * anticlockwise from there.
 *
 * Signature element: the mahadasha arc wrapping the diamond, so the chart also
 * reads as a clock. Brass is reserved for the running period and used nowhere else.
 */

const SIZE = 400;
const C = SIZE / 2;

/** The four points where the diagonals meet the rhombus. */
const P = {
  tl: [100, 100],
  tr: [300, 100],
  br: [300, 300],
  bl: [100, 300],
} as const;

const CELLS: Record<
  HouseNumber,
  { points: string; label: [number, number]; centroid: [number, number] }
> = {
  1: {
    points: `200,0 300,100 200,200 100,100`,
    label: [200, 60],
    centroid: [200, 108],
  },
  2: { points: `0,0 200,0 100,100`, label: [100, 26], centroid: [100, 52] },
  3: { points: `0,0 100,100 0,200`, label: [26, 100], centroid: [52, 100] },
  4: {
    points: `0,200 100,100 200,200 100,300`,
    label: [60, 200],
    centroid: [108, 200],
  },
  5: { points: `0,200 100,300 0,400`, label: [26, 300], centroid: [52, 300] },
  6: {
    points: `0,400 100,300 200,400`,
    label: [100, 374],
    centroid: [100, 348],
  },
  7: {
    points: `200,400 100,300 200,200 300,300`,
    label: [200, 340],
    centroid: [200, 292],
  },
  8: {
    points: `200,400 300,300 400,400`,
    label: [300, 374],
    centroid: [300, 348],
  },
  9: {
    points: `400,400 300,300 400,200`,
    label: [374, 300],
    centroid: [348, 300],
  },
  10: {
    points: `400,200 300,100 200,200 300,300`,
    label: [340, 200],
    centroid: [292, 200],
  },
  11: {
    points: `400,0 300,100 400,200`,
    label: [374, 100],
    centroid: [348, 100],
  },
  12: { points: `200,0 400,0 300,100`, label: [300, 26], centroid: [300, 52] },
};

const PLANET_MEANING: Record<PlanetName, string> = {
  Sun: "authority, father, vitality, recognition",
  Moon: "mind, mother, emotional weather, the public",
  Mars: "drive, conflict, siblings, surgery and accidents",
  Mercury: "speech, analysis, trade, nerves",
  Jupiter: "teaching, wealth, children, belief",
  Venus: "partnership, comfort, art, value",
  Saturn: "time, labour, delay, endurance",
  Rahu: "appetite, the foreign and unfamiliar, amplification",
  Ketu: "detachment, inherited skill, what is already finished",
};

/** 14.33 becomes 14 deg 20 min. Decimal degrees are unreadable at a glance. */
function dms(degree: number): string {
  const d = Math.floor(degree);
  const m = Math.round((degree - d) * 60);
  return `${d}\u00b0${String(m).padStart(2, "0")}'`;
}

/** Standard combustion orbs, in degrees from the Sun. */
const COMBUST_ORB: Partial<Record<PlanetName, number>> = {
  Moon: 12,
  Mars: 17,
  Mercury: 14,
  Jupiter: 11,
  Venus: 10,
  Saturn: 15,
};

const FUNCTIONAL_MEANING: Record<string, string> = {
  Yogakaraka:
    "The most useful planet in this chart. Strengthen this one before anything else.",
  Benefic: "Works for this native. Its periods tend to deliver.",
  Neutral: "No strong functional bias either way.",
  Maraka:
    "A maraka for this lagna. Not fatal in itself, but its periods bring endings and transitions.",
  Malefic:
    "Works against this native. Its periods ask for effort and usually cost something.",
};

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function arcPath(r: number, fraction: number): string {
  const sweep = Math.max(0.001, Math.min(0.9999, fraction)) * 360;
  const [x1, y1] = polar(C, C, r, 0);
  const [x2, y2] = polar(C, C, r, sweep);
  return `M ${x1} ${y1} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${x2} ${y2}`;
}

/** Lay planets out in rows of two inside a cell, centred on its centroid. */
function badgePositions(
  centroid: [number, number],
  count: number,
): [number, number][] {
  const [cx, cy] = centroid;
  const rows = Math.ceil(count / 2);
  return Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / 2);
    const inRow = count - row * 2 === 1 ? 1 : 2;
    const col = i % 2;
    const dx = inRow === 1 ? 0 : (col - 0.5) * 30;
    const dy = (row - (rows - 1) / 2) * 17;
    return [cx + dx, cy + dy] as [number, number];
  });
}

function PlanetBadge({
  placement,
  chart,
  x,
  y,
}: {
  placement: PlanetPlacement;
  chart: ChartData;
  x: number;
  y: number;
}) {
  const ascendantSign = chart.ascendantSign;
  const dignity = dignityOf(placement.planet, placement.sign);
  const owns = housesRuledBy(placement.planet, ascendantSign);
  const nature = functionalNature(placement.planet, ascendantSign);

  /* Distance from the exact degree of exaltation or fall. A planet sitting on its
     deepest debilitation is a different matter from one several degrees past it,
     and "debilitated" alone hides that entirely. */
  const exactDegree =
    dignity === "Exalted"
      ? EXALTATION[placement.planet]?.degree
      : dignity === "Debilitated"
        ? DEBILITATION[placement.planet]?.degree
        : undefined;
  const fromExact =
    exactDegree === undefined ? null : placement.degree - exactDegree;

  const sun = chart.placements.find((p) => p.planet === "Sun");
  const orb = COMBUST_ORB[placement.planet];
  const separation =
    sun && orb
      ? Math.abs(((placement.longitude - sun.longitude + 540) % 360) - 180)
      : null;
  const combustBy =
    separation !== null && orb !== undefined && separation < orb
      ? separation
      : null;

  const colour =
    dignity === "Debilitated"
      ? "rgb(var(--vermilion))"
      : dignity === "Exalted"
        ? "rgb(var(--lapis))"
        : "rgb(var(--ivory))";

  const marker =
    dignity === "Exalted"
      ? "\u2191"
      : dignity === "Debilitated"
        ? "\u2193"
        : "";

  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger
          // nativeButton={false}
          render={
            <g
              tabIndex={0}
              role="button"
              aria-label={`${placement.planet} in ${placement.sign}`}
              className="cursor-help"
            />
          }
        >
          <rect
            x={x - 15}
            y={y - 8}
            width={30}
            height={16}
            rx={2}
            fill="transparent"
          />
          <text
            x={x}
            y={y + 4}
            textAnchor="middle"
            fontFamily="var(--font-data)"
            fontSize={12}
            fill={colour}
          >
            {PLANET_ABBR[placement.planet]}
            {marker}
            {placement.isRetrograde && (
              <tspan fontSize={9} dy={-3}>
                R
              </tspan>
            )}
          </text>
        </TooltipTrigger>

        <TooltipContent side="top" className="panel p-0">
          {/*
            Explicit column and a fixed width. Relying on the parent's spacing let
            these blocks lay out side by side, which turned the tooltip into
            columns of single words.
          */}
          <div className="flex w-[17rem] flex-col gap-2 p-3 text-[12px] leading-snug">
            <div className="flex items-baseline justify-between gap-2">
              <span className="data text-[13px] text-[rgb(var(--ivory))]">
                {placement.planet} {dms(placement.degree)} {placement.sign}
              </span>
              <span className="data text-[10px] text-[rgb(var(--muted))]">
                house {placement.house}
              </span>
            </div>

            <div className="data text-[10px] text-[rgb(var(--muted))]">
              {placement.nakshatra} pada {placement.nakshatraPada}
              {placement.isRetrograde && " \u00b7 retrograde"}
            </div>

            <div className="flex flex-col gap-1 border-t border-[rgb(var(--hairline))] pt-2">
              <span
                className="data text-[10px] uppercase tracking-widest"
                style={{ color: colour }}
              >
                {dignity === "Neutral" ? "No special dignity" : dignity}
              </span>

              {fromExact !== null && (
                <span className="text-[rgb(var(--ivory))]">
                  {Math.abs(fromExact) < 1
                    ? `Within a degree of exact ${dignity === "Exalted" ? "exaltation" : "fall"}. This is as ${dignity === "Exalted" ? "strong" : "weak"} as it gets.`
                    : `${Math.abs(fromExact).toFixed(1)}\u00b0 ${fromExact > 0 ? "past" : "short of"} the exact point, so ${dignity === "Exalted" ? "strong, though not at peak" : "weak, though off the worst of it"}.`}
                </span>
              )}

              {combustBy !== null && (
                <span className="text-[rgb(var(--vermilion))]">
                  Combust, {combustBy.toFixed(1)}\u00b0 from the Sun. Burnt up,
                  and struggles to deliver its own results whatever else the
                  chart says.
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1 border-t border-[rgb(var(--hairline))] pt-2">
              <span className="text-[rgb(var(--ivory))]">
                {owns.length
                  ? `Rules the ${owns.map(ordinal).join(" and ")}.`
                  : "Owns no house. Read through its dispositor and the house it occupies."}
              </span>
              <span className="text-[rgb(var(--muted))]">
                {FUNCTIONAL_MEANING[nature]}
              </span>
            </div>

            <div className="border-t border-[rgb(var(--hairline))] pt-2 text-[rgb(var(--ivory))]">
              Carries {PLANET_MEANING[placement.planet]}. In the{" "}
              {ordinal(placement.house)} it lands on that area first.
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function NorthIndianChart({
  chart,
  active,
  className,
  selectedHouse,
  onSelectHouse,
}: {
  chart: ChartData;
  active?: RingPeriod | null;
  className?: string;
  /** When set, the chart doubles as a navigator for the house analysis. */
  selectedHouse?: HouseNumber | null;
  onSelectHouse?: (house: HouseNumber) => void;
}) {
  const byHouse = useMemo(() => {
    const map = {} as Record<HouseNumber, PlanetPlacement[]>;
    for (let h = 1; h <= 12; h++) map[h as HouseNumber] = [];
    for (const p of chart.placements) map[p.house].push(p);
    return map;
  }, [chart]);

  const ascIdx = signIndex(chart.ascendantSign);

  return (
    <svg
      /* The outer padding exists only for the dasha ring and its label. Without a
         ring it is dead margin, so the chart reclaims about 15% of its size. */
      viewBox={active ? "-34 -34 468 468" : "-8 -8 416 416"}
      className={className}
      role="img"
      aria-label={`${chart.varga} chart`}
    >
      {/* Dasha ring - the chart doubles as a clock for the running period. */}
      {active && (
        <g>
          <circle
            cx={C}
            cy={C}
            r={224}
            fill="none"
            stroke="rgb(var(--hairline))"
            strokeWidth={4}
          />
          <path
            d={arcPath(224, active.mahaProgress)}
            fill="none"
            stroke="rgb(var(--brass))"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <text
            x={C}
            y={-14}
            textAnchor="middle"
            fontFamily="var(--font-data)"
            fontSize={11}
            letterSpacing="0.12em"
            fill="rgb(var(--brass))"
          >
            {active.maha.lord.toUpperCase()}
            {active.antar ? ` / ${active.antar.lord.toUpperCase()}` : ""}
          </text>
        </g>
      )}

      {/* The five lines that make twelve houses. */}
      <g stroke="rgb(var(--hairline))" strokeWidth={1.25} fill="none">
        <rect x={0} y={0} width={SIZE} height={SIZE} />
        <line x1={0} y1={0} x2={SIZE} y2={SIZE} />
        <line x1={SIZE} y1={0} x2={0} y2={SIZE} />
        <polygon points={`${C},0 ${SIZE},${C} ${C},${SIZE} 0,${C}`} />
      </g>

      {(Object.keys(CELLS) as unknown as HouseNumber[]).map((key) => {
        const house = Number(key) as HouseNumber;
        const cell = CELLS[house];
        const planets = byHouse[house];
        const signNumber = ((ascIdx + house - 1) % 12) + 1;

        return (
          <g key={house}>
            {house === 1 && (
              <polygon
                points={cell.points}
                fill="rgb(var(--brass))"
                fillOpacity={0.07}
              />
            )}

            {/* Hit area sits below the planet badges so their tooltips still win the pointer. */}
            {onSelectHouse && (
              <polygon
                points={cell.points}
                fill={
                  selectedHouse === house ? "rgb(var(--brass))" : "transparent"
                }
                fillOpacity={selectedHouse === house ? 0.16 : 0}
                stroke={
                  selectedHouse === house ? "rgb(var(--brass))" : "transparent"
                }
                strokeWidth={1.5}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={`House ${house}`}
                onClick={() => onSelectHouse(house)}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") && onSelectHouse(house)
                }
              />
            )}

            {/* Sign number, not house number - the fixed diamond already tells you the house. */}
            <text
              x={cell.label[0]}
              y={cell.label[1]}
              textAnchor="middle"
              fontFamily="var(--font-data)"
              fontSize={11}
              fill="rgb(var(--muted))"
            >
              {signNumber}
            </text>

            {badgePositions(cell.centroid, planets.length).map(([x, y], i) => (
              <PlanetBadge
                key={planets[i].planet}
                placement={planets[i]}
                chart={chart}
                x={x}
                y={y}
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}
