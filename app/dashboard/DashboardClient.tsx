"use client";

import { useEffect, useState } from "react";
import DivineLoader from "@/components/DivineLoader";
import { useWorkstation } from "@/store/chart-store";
import { ClientPanel } from "@/components/panels/ClientPanel";
import { PatternsPanel } from "@/components/panels/PatternsPanel";
import { TopicsPanel } from "@/components/panels/TopicsPanel";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

export default function DashboardClient() {
  const loadClients = useWorkstation((s) => s.loadClients);
  const clientsLoaded = useWorkstation((s) => s.clientsLoaded);

  /* The animation finishing is one condition; the data arriving is the other. */
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  /*
   * Both conditions, deliberately. Waiting only on the animation shows an empty
   * workstation while the client list is still in flight; waiting only on the
   * data cuts the animation off mid-draw on a fast connection. Whichever is
   * slower wins, and the splash covers the whole start-up rather than a fixed
   * number of seconds.
   */
  if (!introDone || !clientsLoaded) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgb(var(--ink))]">
        <DivineLoader onComplete={() => setIntroDone(true)} />
      </div>
    );
  }

  return (
    <main className="h-screen w-screen overflow-hidden bg-[rgb(var(--ink))] p-2">
      <ResizablePanelGroup>
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
