"use client";

import { useState } from "react";
import DivineLoader from "@/components/DivineLoader";
import { ClientPanel } from "@/components/panels/ClientPanel";
import { PatternsPanel } from "@/components/panels/PatternsPanel";
import { TopicsPanel } from "@/components/panels/TopicsPanel";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

export default function DashboardClient() {
  const [isLoading, setIsLoading] = useState(true);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgb(var(--ink))]">
        <DivineLoader onComplete={() => setIsLoading(false)} />
      </div>
    );
  }

  return (
    <main className="h-screen w-screen overflow-hidden bg-[rgb(var(--ink))] p-2">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={35} minSize={20}>
          <ClientPanel />
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={35} minSize={20}>
          <PatternsPanel />
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={30} minSize={20}>
          <TopicsPanel />
        </ResizablePanel>
      </ResizablePanelGroup>
    </main>
  );
}
