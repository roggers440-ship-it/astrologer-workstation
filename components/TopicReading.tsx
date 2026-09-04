'use client';

import { useMemo } from 'react';
import { ArrowRight, CircleAlert, CircleCheck, Clock, Minus } from 'lucide-react';
import type { ConsultationHook, NatalChart, Topic } from '@/types/astrology';
import { deriveTopicReading, topicEvents, type Verdict } from '@/lib/topic-reading';
import { CheatSheetTooltip } from '@/components/CheatSheetTooltip';
import { YogaCard } from '@/components/YogaCard';
import { yogasForTopic, type Yoga } from '@/lib/yogas';
import { Badge } from '@/components/ui/badge';

/**
 * One topic, fully expanded.
 *
 * Order matters here and follows how a reading is actually delivered: the verdict
 * first so the astrologer knows the shape of what they are about to say, then the
 * houses that produced it, then the significators, then when the topic has been
 * and will be live. Hand-written rules come last, as the sharp specifics on top
 * of the derived base rather than a replacement for it.
 */

const VERDICT_STYLE: Record<Verdict, { colour: string; icon: React.ReactNode }> = {
  Supported: { colour: 'rgb(var(--lapis))', icon: <CircleCheck className="h-3.5 w-3.5" /> },
  Mixed: { colour: 'rgb(var(--brass))', icon: <Minus className="h-3.5 w-3.5" /> },
  Demanding: { colour: 'rgb(var(--vermilion))', icon: <CircleAlert className="h-3.5 w-3.5" /> },
};

export function TopicReading({
  topic,
  natal,
  hooks,
  yogas,
}: {
  topic: Topic;
  natal: NatalChart;
  hooks: ConsultationHook[];
  yogas: Yoga[];
}) {
  const reading = useMemo(() => deriveTopicReading(natal.charts.D1, topic), [natal, topic]);
  const events = useMemo(() => topicEvents(natal, topic), [natal, topic]);
  const style = VERDICT_STYLE[reading.verdict];
  const topicYogas = useMemo(() => yogasForTopic(yogas, topic.id), [yogas, topic.id]);

  return (
    <div className="space-y-4">
      {topic.handlingNote && (
        <p className="border-l-2 border-[rgb(var(--vermilion))] pl-2 text-[rgb(var(--muted))]">
          {topic.handlingNote}
        </p>
      )}

      <div>
        <div className="mb-1 flex items-center gap-2" style={{ color: style.colour }}>
          {style.icon}
          <span className="eyebrow" style={{ color: style.colour }}>{reading.verdict}</span>
        </div>
        <p className="text-[rgb(var(--ivory))]">{reading.headline}</p>
      </div>

      {(reading.strengths.length > 0 || reading.cautions.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {reading.strengths.map((s) => (
            <span key={s} className="rounded border border-[rgb(var(--lapis))] px-1.5 py-0.5 text-[11px] text-[rgb(var(--lapis))]">
              {s}
            </span>
          ))}
          {reading.cautions.map((c) => (
            <span key={c} className="rounded border border-[rgb(var(--vermilion))] px-1.5 py-0.5 text-[11px] text-[rgb(var(--vermilion))]">
              {c}
            </span>
          ))}
        </div>
      )}

      {topicYogas.length > 0 && (
        <section>
          <h5 className="eyebrow mb-1.5">Named combinations</h5>
          <div className="space-y-3">
            {topicYogas.map((y) => (
              <YogaCard key={y.id} yoga={y} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h5 className="eyebrow mb-1.5">Houses read for this</h5>
        <div className="space-y-2">
          {reading.houses.map((h) => (
            <div key={h.house} className="border-l border-[rgb(var(--hairline))] pl-2.5">
              <div className="data mb-0.5 text-[11px] text-[rgb(var(--muted))]">
                {h.house}H &middot; {h.sign} &middot; lord {h.lord} in {h.lordHouse}H
                {h.lordDignity !== 'Neutral' && (
                  <span style={{ color: h.lordDignity === 'Debilitated' ? 'rgb(var(--vermilion))' : 'rgb(var(--lapis))' }}>
                    {' '}&middot; {h.lordDignity}
                  </span>
                )}
              </div>
              <p className="text-[rgb(var(--ivory))]">{h.line}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h5 className="eyebrow mb-1.5">Significators</h5>
        <div className="space-y-1.5">
          {reading.karakas.map((k) => (
            <p key={k.planet} className="text-[rgb(var(--ivory))]">{k.line}</p>
          ))}
        </div>
      </section>

      <section>
        <h5 className="eyebrow mb-1.5 flex items-center gap-1.5">
          <Clock className="h-3 w-3" /> When this topic is live
        </h5>
        <p className="mb-2 text-[11px] text-[rgb(var(--muted))]">
          Periods run by the planets that carry this topic. Check the past ones against what they remember before
          leaning on the future ones.
        </p>

        <ol className="space-y-2">
          {events.map((e, i) => (
            <li key={`${e.label}-${e.year}-${i}`} className="flex gap-2.5">
              <span
                className="data w-[74px] shrink-0 text-[11px]"
                style={{
                  color: e.isCurrent ? 'rgb(var(--brass))'
                    : e.isFuture ? 'rgb(var(--lapis))'
                    : 'rgb(var(--muted))',
                }}
              >
                {e.year}
                {e.endYear !== e.year && <>&ndash;{String(e.endYear).slice(2)}</>}
              </span>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium text-[rgb(var(--ivory))]">{e.label}</span>
                  {e.isCurrent && (
                    <Badge className="border-[rgb(var(--brass))] bg-transparent text-[10px] text-[rgb(var(--brass))]">
                      running now
                    </Badge>
                  )}
                  <Badge className="border-[rgb(var(--hairline))] bg-transparent text-[10px] text-[rgb(var(--muted))]">
                    {e.kind}
                  </Badge>
                </div>
                <p className="text-[rgb(var(--muted))]">{e.reason} {e.guidance}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {hooks.length > 0 && (
        <section className="border-t border-[rgb(var(--hairline))] pt-3">
          <h5 className="eyebrow mb-1.5 flex items-center gap-1.5">
            <ArrowRight className="h-3 w-3" /> Specific combinations found
          </h5>
          <div className="space-y-2.5">
            {hooks.map((h) => (
              <article key={h.id}>
                <h6 className="font-medium text-[rgb(var(--ivory))]">
                  <CheatSheetTooltip definition={h.cheatSheetNote} plainEnglish={h.interpretiveGuideline}>
                    {h.title}
                  </CheatSheetTooltip>
                </h6>
                <p className="mt-0.5 text-[rgb(var(--ivory))]">{h.interpretiveGuideline}</p>
                {h.evidence?.length ? (
                  <p className="data mt-1 text-[10px] text-[rgb(var(--muted))]">{h.evidence.join('  \u00b7  ')}</p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
