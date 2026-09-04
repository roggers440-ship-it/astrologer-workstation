'use client';

import { useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
import { useWorkstation } from '@/store/chart-store';
import { TAB_GROUPS, topicById, type TabKey } from '@/lib/topics';
import { hooksForTopic, ordinal } from '@/lib/rule-engine';
import { answersWithContext, buildContext } from '@/lib/answers';
import { AnswerCard } from '@/components/AnswerCard';
import { AnalysisSection } from '@/components/AnalysisSection';
import { ConfidentialGate } from '@/components/ConfidentialGate';
import { TopicReading } from '@/components/TopicReading';
import { MedicalPanel } from '@/components/medical/MedicalPanel';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

/**
 * The twenty topics, answered.
 *
 * This panel answers what the client actually asked - a verdict and a date -
 * rather than showing the reasoning. The houses dialog and the year timeline
 * already carry the working, and repeating it here buried the answer under the
 * method.
 *
 * Two topics do not fit that pattern: medical belongs on a body map, and
 * longevity stays behind the passphrase.
 */
export function TopicsPanel() {
  const { natal, client, hooks, yogas, activeTab, setTab, confidentialUnlocked } = useWorkstation();
  const [openTopic, setOpenTopic] = useState<number | null>(null);

  /* Built once per chart. Each context computes ashtakavarga and detects every
     yoga, so rebuilding it per topic would repeat that work eighteen times. */
  const ctx = useMemo(() => (natal ? buildContext(natal) : null), [natal]);

  if (!natal || !ctx) {
    return (
      <section className="panel @container flex h-full w-full items-center justify-center p-3 text-[rgb(var(--muted))]">
        <p className="max-w-[26ch] text-center">
          The twenty topics fill in from the chart. Load a client to start.
        </p>
      </section>
    );
  }

  return (
    <section className="panel @container flex h-full w-full flex-col overflow-hidden">
      <Tabs value={activeTab} onValueChange={(v) => setTab(v as TabKey)} className="flex h-full flex-col">
        <TabsList className="grid grid-cols-1 gap-1 bg-transparent p-2 @[20rem]:grid-cols-2 @[32rem]:grid-cols-4">
          {TAB_GROUPS.map((g) => (
            <TabsTrigger key={g.key} value={g.key} className="data min-w-0 truncate text-[10px] leading-tight">
              {g.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TAB_GROUPS.map((group) => (
          <TabsContent key={group.key} value={group.key} className="m-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="divide-y divide-[rgb(var(--hairline))]">
                {group.topicIds.map((id) => {
                  const topic = topicById(id)!;
                  const isOpen = openTopic === id;
                  const locked = topic.confidential && !confidentialUnlocked;

                  /* Only the open topic is computed. Answer modules do real work
                     and running all eighteen on every render is wasted effort. */
                  const answers = isOpen ? answersWithContext(ctx, id) : null;

                  return (
                    <div key={id}>
                      <button
                        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-[rgb(var(--hairline))]/30"
                        onClick={() => setOpenTopic(isOpen ? null : id)}
                        aria-expanded={isOpen}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="data text-[10px] text-[rgb(var(--muted))]">
                            {String(id).padStart(2, '0')}
                          </span>
                          <span className="truncate text-[rgb(var(--ivory))]">{topic.name}</span>
                          {topic.confidential && (
                            <Badge className="gap-1 border-[rgb(var(--vermilion))] bg-transparent text-[10px] text-[rgb(var(--vermilion))]">
                              <Lock className="h-2.5 w-2.5" /> Private
                            </Badge>
                          )}
                        </span>

                        <span className="data shrink-0 text-[10px] text-[rgb(var(--muted))]">
                          {topic.houses.map(ordinal).join(' \u00b7 ')}
                        </span>
                      </button>

                      {isOpen && (
                        <div className="space-y-4 px-4 pb-5 pl-11">
                          {topic.handlingNote && (
                            <p className="border-l-2 border-[rgb(var(--vermilion))] pl-2 text-[rgb(var(--muted))]">
                              {topic.handlingNote}
                            </p>
                          )}

                          {locked ? (
                            <ConfidentialGate label="Reveal for practitioner reference">
                              <TopicReading
                                topic={topic}
                                natal={natal}
                                hooks={hooksForTopic(hooks, id)}
                                yogas={yogas}
                              />
                            </ConfidentialGate>
                          ) : id === 8 ? (
                            <MedicalPanel natal={natal} />
                          ) : answers ? (
                            <div className="space-y-5">
                              {client && (
                                <AnalysisSection
                                  clientId={client.id}
                                  mode="topic"
                                  scope={id}
                                  label="Say it in plain words"
                                />
                              )}
                              {answers.map((a, i) => (
                                <AnswerCard key={`${id}-${i}`} answer={a} />
                              ))}
                            </div>
                          ) : (
                            <TopicReading
                              topic={topic}
                              natal={natal}
                              hooks={hooksForTopic(hooks, id)}
                              yogas={yogas}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
