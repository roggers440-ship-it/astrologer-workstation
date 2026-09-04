"use client";

import {
  CalendarDays,
  CircleDot,
  Gem,
  Hash,
  Link2,
  Lock,
  Moon,
  Palette,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { ChartData, PanchangaData } from "@/types/astrology";
import { ayurdaya, bhagyodaya, remedialProfile } from "@/lib/native-profile";
import { CheatSheetTooltip } from "@/components/CheatSheetTooltip";
import { ConfidentialGate } from "@/components/ConfidentialGate";
import { Button } from "@/components/ui/button";

/**
 * The native's fixed reference data: the five limbs of the birth moment, and the
 * colours, days and numbers that follow from functional benefics and malefics
 * for this lagna.
 *
 * These do not change with the dasha, so they sit at the top of the panel as
 * standing context rather than in the scrolling interpretive material.
 */

function Card({
  icon,
  label,
  value,
  detail,
  accent = "brass",
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  detail?: string;
  accent?: "brass" | "vermilion" | "lapis";
}) {
  const colour = `rgb(var(--${accent}))`;
  return (
    <div className="rounded border border-[rgb(var(--hairline))] p-2.5">
      <div className="mb-1 flex items-center gap-1.5" style={{ color: colour }}>
        {icon}
        <span className="eyebrow" style={{ color: colour }}>
          {label}
        </span>
      </div>
      <div className="data text-[13px] text-[rgb(var(--ivory))]">{value}</div>
      {detail && (
        <p className="mt-1 text-[11px] leading-snug text-[rgb(var(--muted))]">
          {detail}
        </p>
      )}
    </div>
  );
}

function Swatches({ colours }: { colours: string[] }) {
  /* Named colours mapped to something showable. Anything unmapped falls through
     to the text label alone rather than rendering a misleading square. */
  const HEX: Record<string, string> = {
    Copper: "#B87333",
    "Deep orange": "#D2601A",
    Saffron: "#E8A33D",
    White: "#F2EFE6",
    Cream: "#EDE4CF",
    Silver: "#C9CDD4",
    Red: "#C0392B",
    Scarlet: "#B22222",
    Coral: "#E06B5A",
    Green: "#3C8D5B",
    Emerald: "#2E9E6B",
    Olive: "#7A8B3C",
    Yellow: "#D9B23A",
    Gold: "#C89B3C",
    Turmeric: "#D2A02A",
    "Pastel pink": "#E4C1C8",
    "Dark blue": "#2B4C8C",
    Black: "#1A1A1F",
    Indigo: "#3B3B7A",
    "Smoky grey": "#7A7A82",
    Ultramarine: "#3A46B0",
    Brown: "#7A5A3C",
    Multicoloured: "#8A7FA8",
    Grey: "#8A8F99",
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {colours.map((c) => (
        <span
          key={c}
          className="flex items-center gap-1 text-[11px] text-[rgb(var(--ivory))]"
        >
          {HEX[c] && (
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm border border-[rgb(var(--hairline))]"
              style={{ background: HEX[c] }}
              aria-hidden
            />
          )}
          {c}
        </span>
      ))}
    </div>
  );
}

export function NativeProfileCards({
  chart,
  panchanga,
}: {
  chart: ChartData;
  panchanga: PanchangaData;
}) {
  const profile = remedialProfile(chart);
  const bhagya = bhagyodaya(chart);
  const ayu = ayurdaya(chart);

  return (
    <div className="space-y-4">
      <section>
        <h3 className="eyebrow mb-2">Jaatak Panchaanga</h3>
        <div className="grid grid-cols-2 gap-2">
          <Card
            icon={<Moon className="h-3.5 w-3.5" />}
            label="Tithi"
            value={`${panchanga.tithi.paksha} ${panchanga.tithi.name}`}
            detail={panchanga.tithi.note}
          />
          <Card
            icon={<CalendarDays className="h-3.5 w-3.5" />}
            label="Vara"
            value={`${panchanga.vara.name} \u00b7 ${panchanga.vara.lord}`}
            detail={panchanga.vara.note}
            accent={panchanga.vara.beforeSunrise ? "vermilion" : "brass"}
          />
          <Card
            icon={<Sparkles className="h-3.5 w-3.5" />}
            label="Nakshatra"
            value={`${panchanga.nakshatra.name} \u00b7 pada ${panchanga.nakshatra.pada}`}
            detail={panchanga.nakshatra.note}
          />
          <Card
            icon={<Link2 className="h-3.5 w-3.5" />}
            label="Yoga"
            value={panchanga.yoga.name}
            detail={panchanga.yoga.note}
          />
          <Card
            icon={<CircleDot className="h-3.5 w-3.5" />}
            label="Karana"
            value={panchanga.karana.name}
            detail={panchanga.karana.note}
          />
          <Card
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label="Bhagyodaya"
            value={`Around age ${bhagya.age}`}
            detail={bhagya.note}
          />
        </div>
      </section>

      <section>
        <h3 className="eyebrow mb-2">
          <CheatSheetTooltip
            definition="Functional benefics for this lagna: lords of the trikonas, and any planet owning both a kendra and a trikona."
            plainEnglish="The planets that help this particular person. Different from the planets that are 'good' in general - Saturn is a difficult planet by nature but the best one in the chart for some rising signs."
          >
            Favourable
          </CheatSheetTooltip>
        </h3>

        <div className="mb-2 flex flex-wrap gap-1.5">
          {profile.favourable.planets.map((p) => (
            <CheatSheetTooltip
              key={p.planet}
              definition={p.why}
              plainEnglish={`Strengthen ${p.planet} through its colour, day and number.`}
            >
              <span className="data rounded border border-[rgb(var(--brass))] px-1.5 py-0.5 text-[11px] text-[rgb(var(--brass))]">
                {p.planet}
                {p.nature === "Yogakaraka" && " \u2605"}
              </span>
            </CheatSheetTooltip>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Card
            icon={<Palette className="h-3.5 w-3.5" />}
            label="Colours"
            value={<Swatches colours={profile.favourable.colours} />}
          />
          <Card
            icon={<CalendarDays className="h-3.5 w-3.5" />}
            label="Days"
            value={profile.favourable.days.join(", ") || "\u2014"}
          />
          <Card
            icon={<Hash className="h-3.5 w-3.5" />}
            label="Numbers"
            value={profile.favourable.numbers.join(" \u00b7 ") || "\u2014"}
          />
          <Card
            icon={<Gem className="h-3.5 w-3.5" />}
            label="Stones"
            value={profile.favourable.gems.join(", ") || "\u2014"}
            detail="Only after checking the dasha - a stone for a badly placed planet makes things worse, not better."
          />
        </div>
      </section>

      <section>
        <h3 className="eyebrow mb-2">
          <CheatSheetTooltip
            definition="Functional malefics: lords of the 3rd, 6th, 8th, 11th and 12th for this lagna."
            plainEnglish="The planets that tend to create friction for this person specifically. Their colours and numbers are worth de-emphasising, not avoiding superstitiously."
          >
            Unfavourable
          </CheatSheetTooltip>
        </h3>

        <div className="mb-2 flex flex-wrap gap-1.5">
          {profile.unfavourable.planets.map((p) => (
            <CheatSheetTooltip
              key={p.planet}
              definition={p.why}
              plainEnglish={`${p.planet} tends to create friction for this lagna.`}
            >
              <span className="data rounded border border-[rgb(var(--vermilion))] px-1.5 py-0.5 text-[11px] text-[rgb(var(--vermilion))]">
                {p.planet}
              </span>
            </CheatSheetTooltip>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Card
            accent="vermilion"
            icon={<Palette className="h-3.5 w-3.5" />}
            label="Colours to soften"
            value={<Swatches colours={profile.unfavourable.colours} />}
          />
          <Card
            accent="vermilion"
            icon={<CalendarDays className="h-3.5 w-3.5" />}
            label="Days to watch"
            value={profile.unfavourable.days.join(", ") || "\u2014"}
          />
          <Card
            accent="vermilion"
            icon={<Hash className="h-3.5 w-3.5" />}
            label="Numbers"
            value={profile.unfavourable.numbers.join(" \u00b7 ") || "\u2014"}
          />
          <Card
            accent="vermilion"
            icon={<ShieldAlert className="h-3.5 w-3.5" />}
            label="Framing"
            value="De-emphasise, don't avoid"
            detail="Clients act on this literally. Say it as a preference, not a prohibition."
          />
        </div>
      </section>

      {/*
        Ayurdaya sits behind the same reveal as topic 9 and is never on screen by
        default. The classical schemes disagree by decades on the same chart, and
        a lifespan band displayed on a card will be read as a prediction whatever
        caveat sits next to it.
      */}
      {/* <section>
        <h3 className="eyebrow mb-2 flex items-center gap-1.5">
          <Lock className="h-3 w-3 text-[rgb(var(--vermilion))]" />
          Jivan matra \u00b7 practitioner only
        </h3>

        <ConfidentialGate label="Reveal longevity band">
          <div className="rounded border border-[rgb(var(--vermilion))] p-2.5">
            <div className="data text-[13px] text-[rgb(var(--ivory))]">
              {ayu.band} &middot; {ayu.approximateRange}
            </div>
            <ul className="mt-1.5 space-y-0.5 text-[11px] text-[rgb(var(--muted))]">
              {ayu.pairs.map((p) => (
                <li key={p.pair}>
                  {p.pair}: {p.verdict}
                </li>
              ))}
            </ul>
            <p className="mt-2 border-t border-[rgb(var(--hairline))] pt-2 text-[11px] text-[rgb(var(--muted))]">
              {ayu.caution}
            </p>
          </div>
        </ConfidentialGate>
      </section> */}
    </div>
  );
}
