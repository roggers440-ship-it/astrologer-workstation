"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { useWorkstation } from "@/store/chart-store";
import { TAB_GROUPS, topicById, type TabKey } from "@/lib/topics";
import { ordinal } from "@/lib/rule-engine";
import type { PublicTopic, Teaser } from "@/types/reading";
import { AnswerCard } from "@/components/AnswerCard";
import { AnalysisSection } from "@/components/AnalysisSection";
import { LockedCard } from "@/components/LockedCard";
import { PanelLoading } from "@/components/PanelLoading";
import { ConfidentialGate } from "@/components/ConfidentialGate";
import { LongevityPanel } from "@/components/LongevityPanel";
import { MedicalPanel } from "@/components/medical/MedicalPanel";
import { ConsultationNoteComposer } from "@/components/ConsultationNoteComposer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { PanelEmpty } from "../PanelEmpty";

/**
 * The twenty topics, answered.
 *
 * Everything shown here arrives from the server already filtered by plan. A
 * locked topic is a teaser object rather than hidden content, so there is
 * nothing in the page for a reader to uncover.
 */
export function TopicsPanel() {
  const {
    natal,
    client,
    reading,
    status,
    activeTab,
    setTab,
    confidentialUnlocked,
  } = useWorkstation();
  const [openTopic, setOpenTopic] = useState<number | null>(null);

  if (status === "loading") {
    return (
      <section className="panel @container h-full w-full">
        <PanelLoading label="Working through the topics" />
      </section>
    );
  }

  if (!natal || !reading || !client) {
    return (
      <section className="panel @container h-full w-full">
        <PanelEmpty
          mark="list"
          title="Twenty questions"
          line="Career, marriage, money, health and the rest — answered from the chart, with dates."
        />
      </section>
    );
  }

  const isLocked = (entry: PublicTopic | Teaser | undefined): entry is Teaser =>
    Boolean(entry && "locked" in entry && entry.locked);

  return (
    <section className="panel @container flex h-full w-full flex-col overflow-hidden">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setTab(v as TabKey)}
        className="flex h-full flex-col"
      >
        {/* Container-Based Mobile/Small Select Dropdown */}
        <div className="p-2 @[28rem]:hidden">
          <select
            value={activeTab}
            onChange={(e) => setTab(e.target.value as TabKey)}
            className="panel data w-full rounded px-2 py-1.5 text-[rgb(var(--ivory))]"
          >
            {TAB_GROUPS.map((g) => (
              <option
                key={g.key}
                value={g.key}
                className="bg-[rgb(var(--background))] text-[rgb(var(--ivory))]"
              >
                {g.label}
              </option>
            ))}
          </select>
        </div>

        {/* Container-Based Desktop Grid TabsList */}
        <TabsList className="hidden grid-cols-1 gap-1 bg-transparent p-2 @[28rem]:grid @[28rem]:grid-cols-4">
          {TAB_GROUPS.map((g) => (
            <TabsTrigger
              key={g.key}
              value={g.key}
              className="data min-w-0 p-2.5 truncate text-[10px] leading-tight"
            >
              {g.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TAB_GROUPS.map((group) => (
          <TabsContent
            key={group.key}
            value={group.key}
            className="m-0 flex-1 overflow-hidden"
          >
            <ScrollArea className="h-full">
              <div className="divide-y divide-[rgb(var(--hairline))]">
                {group.topicIds.map((id) => {
                  const topic = topicById(id)!;
                  const entry = reading.topics[id];
                  const locked = isLocked(entry);
                  const isOpen = openTopic === id;
                  const confidential =
                    topic.confidential && !confidentialUnlocked;

                  return (
                    <div key={id}>
                      <button
                        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-[rgb(var(--hairline))]/30"
                        onClick={() => setOpenTopic(isOpen ? null : id)}
                        aria-expanded={isOpen}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="data text-[10px] text-[rgb(var(--muted))]">
                            {String(id).padStart(2, "0")}
                          </span>
                          <span
                            className="truncate"
                            style={{
                              color: locked
                                ? "rgb(var(--muted))"
                                : "rgb(var(--ivory))",
                            }}
                          >
                            {topic.name}
                          </span>
                          {locked && (
                            <Lock className="h-3 w-3 shrink-0 text-[rgb(var(--brass))]" />
                          )}
                          {topic.confidential && (
                            <Badge className="gap-1 border-[rgb(var(--vermilion))] bg-transparent text-[10px] text-[rgb(var(--vermilion))]">
                              Private
                            </Badge>
                          )}
                        </span>

                        <span className="data shrink-0 text-[10px] text-[rgb(var(--muted))]">
                          {topic.houses.map(ordinal).join(" \u00b7 ")}
                        </span>
                      </button>

                      {isOpen && (
                        <div className="space-y-4 px-4 pb-5 pl-11">
                          {locked ? (
                            <LockedCard teaser={entry} title={topic.name} />
                          ) : confidential ? (
                            <ConfidentialGate label="Reveal for practitioner reference">
                              <LongevityPanel natal={natal} />
                            </ConfidentialGate>
                          ) : id === 8 ? (
                            <MedicalPanel
                              regions={reading.medical}
                              note={reading.medicalNote}
                              depth={reading.entitlements.depth}
                            />
                          ) : entry ? (
                            <>
                              {topic.handlingNote && (
                                <p className="border-l-2 border-[rgb(var(--vermilion))] pl-2 text-[rgb(var(--muted))]">
                                  {topic.handlingNote}
                                </p>
                              )}

                              {reading.entitlements.analysis && (
                                <AnalysisSection
                                  clientId={client.id}
                                  mode="topic"
                                  scope={id}
                                  label="Say it in plain words"
                                />
                              )}

                              <div className="space-y-5">
                                {entry.answers.map((a, i) => (
                                  <AnswerCard key={`${id}-${i}`} answer={a} />
                                ))}
                              </div>
                            </>
                          ) : (
                            <p className="text-[rgb(var(--muted))]">
                              Nothing computed for this topic yet.
                            </p>
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

      <ConsultationNoteComposer />
    </section>
  );
}
