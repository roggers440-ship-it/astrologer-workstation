"use client";

import type { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CheatSheetTooltipProps {
  /** What the term denotes technically. Facts and numbers, no softening. */
  definition: string;
  /** What it changes about reading the chart. Also technical - not client phrasing. */
  plainEnglish: string;
  children: ReactNode;
}

/**
 * Wraps any astrological term. Two registers: what it is, then what it does to
 * the reading.
 *
 * Layout is an explicit column at a fixed width. Leaving spacing to the parent
 * let the two blocks sit side by side, which turned the tooltip into columns of
 * broken sentences.
 */
export function CheatSheetTooltip({
  definition,
  plainEnglish,
  children,
}: CheatSheetTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger render={<span className="cheat-term" tabIndex={0} />}>
          {children}
        </TooltipTrigger>

        <TooltipContent side="right" className="panel p-0">
          <div className="flex w-[19rem] flex-col gap-2 p-3 text-[12px] leading-snug">
            <div>
              <span className="eyebrow block">Definition</span>
              <span className="text-[rgb(var(--ivory))]">{definition}</span>
            </div>
            <div className="border-t border-[rgb(var(--hairline))] pt-2">
              <span className="eyebrow block">In practice</span>
              <span className="text-[rgb(var(--ivory))]">{plainEnglish}</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Shared glossary, so a term reads identically everywhere it appears.
 * Entries are terse and factual on purpose - delivery is the astrologer's job,
 * and softened definitions cost space without adding information.
 */
export const GLOSSARY: Record<
  string,
  { definition: string; plainEnglish: string }
> = {
  ayanamsha: {
    definition:
      "Offset between the tropical and sidereal zodiacs, currently about 24 degrees and growing roughly 50 arcseconds a year. Lahiri is the Indian government standard.",
    plainEnglish:
      "Every placement shifts with it. Two astrologers using different ayanamshas will disagree on any planet within a degree of a sign boundary.",
  },
  kendra: {
    definition: "Houses 1, 4, 7 and 10. Angular.",
    plainEnglish:
      "Planets here act visibly and early. Natural benefics owning kendras lose strength (kendradhipati dosha); natural malefics owning them gain it.",
  },
  trikona: {
    definition:
      "Houses 1, 5 and 9. Trines, houses of dharma and accumulated merit.",
    plainEnglish:
      "Trikona lords are functional benefics for any lagna. A planet owning both a kendra and a trikona is a yogakaraka.",
  },
  dusthana: {
    definition:
      "Houses 6, 8 and 12. Houses of difficulty, loss and transformation.",
    plainEnglish:
      "Their lords are functional malefics. A dusthana lord placed in another dusthana forms vipareeta raja yoga and inverts the harm.",
  },
  mahadasha: {
    definition:
      "Major Vimshottari period, 6 to 20 years depending on the lord. Order and starting point are fixed by the Moon\u2019s nakshatra at birth, so the first period is always partial.",
    plainEnglish:
      "Sets background conditions rather than events. Read results from the lord\u2019s house rulership and placement, not from the planet\u2019s natural character.",
  },
  antardasha: {
    definition:
      "Sub-period within a mahadasha. Nine of them, in the same planetary order starting from the maha lord. Length is maha years times sub years, divided by 120.",
    plainEnglish:
      "This is where timing sits. Events cluster where the maha and antar lords have a relationship - mutual aspect, exchange, or shared house.",
  },
  pratyantardasha: {
    definition:
      "Third level, generated from the antardasha by the same formula. Days to a few months.",
    plainEnglish:
      "Narrows timing to weeks. Only worth reading once the maha and antar have already been confirmed against the client\u2019s history.",
  },
  debilitated: {
    definition:
      "A planet in the sign opposite its exaltation, weakest at one exact degree. The strength curve is continuous, so distance from that degree matters.",
    plainEnglish:
      "Check for neechabhanga before treating it as an affliction: cancellation applies if the dispositor or the exaltation lord sits in a kendra from the lagna or the Moon.",
  },
  exalted: {
    definition: "A planet in its strongest sign, peaking at one exact degree.",
    plainEnglish:
      "Strength, not benevolence. An exalted malefic ruling a dusthana produces its results forcefully.",
  },
  eighthLord: {
    definition:
      "Planet ruling the sign on the 8th house. Governs upheaval, inheritance, joint finances, research and what stays hidden.",
    plainEnglish:
      "Its periods rebuild rather than remove. Also the primary longevity indicator, which is why the 8th is read privately.",
  },
  neechabhanga: {
    definition:
      "Cancellation of debilitation. Applies when the dispositor, or the lord of the debilitated planet\u2019s exaltation sign, occupies a kendra from the lagna or the Moon.",
    plainEnglish:
      "Results arrive late and after struggle rather than not at all. Check it before calling any debilitation a defect.",
  },
  sadeSati: {
    definition:
      "Saturn transiting the 12th, 1st and 2nd signs from the natal Moon. About seven and a half years, in three distinct phases.",
    plainEnglish:
      "The middle phase, Saturn over the Moon itself, is the heaviest. Has a fixed end date, which is the most useful thing about it.",
  },
};
