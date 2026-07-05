import { createRootRoute, Outlet } from "@tanstack/react-router";
import { AppHeader } from "@/components/app-header/app-header";
import { AppHotkeys } from "@/components/app-hotkeys";
import { BrowserPanel } from "@/components/browser/browser-panel";
import { FileSearch } from "@/components/file-search";
import { CommandPalette } from "@/components/command-palette";
import { MonacoWorkspace } from "@/components/monaco-workspace";
import { RefactorDialogs } from "@/components/refactor-preview-dialog";
import { Sidebar } from "@/components/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { WorkspaceTrustBanner } from "@/components/workspace-trust-banner";
import { useProblemsPanel } from "@/lib/markers-store";
import { useTerminalStore } from "@/lib/terminal-store";
import { useUiZoom } from "@/lib/ui-zoom";
import { useViewStore } from "@/lib/view-store";
import { Minimize2 } from "lucide-react";
import { lazy, Suspense, useEffect } from "react";
import "../App.css";

const TerminalPanel = lazy(() =>
  import("@/components/terminal/terminal-panel").then((m) => ({
    default: m.TerminalPanel,
  })),
);

const ProblemsPanel = lazy(() =>
  import("@/components/problems-panel").then((m) => ({
    default: m.ProblemsPanel,
  })),
);

const RouterDevtools = import.meta.env.DEV
  ? lazy(() =>
      import("@tanstack/react-router-devtools").then((m) => ({
        default: m.TanStackRouterDevtools,
      })),
    )
  : null;

function TerminalSlot() {
  const open = useTerminalStore((s) => s.open);
  if (!open) return null;
  return (
    <Suspense fallback={null}>
      <TerminalPanel />
    </Suspense>
  );
}

function ProblemsSlot() {
  const open = useProblemsPanel((s) => s.open);
  if (!open) return null;
  return (
    <Suspense fallback={null}>
      <ProblemsPanel />
    </Suspense>
  );
}

function ZenExit() {
  const exitZen = useViewStore((s) => s.exitZen);
  return (
    <button
      type="button"
      onClick={exitZen}
      title="Zen-Modus verlassen (⌥⌘Z)"
      className="fixed right-3 top-3 z-50 inline-flex items-center gap-1.5 rounded-md bg-foreground/8 px-2 py-1 text-xs font-medium text-muted-foreground opacity-30 backdrop-blur-md transition-opacity duration-200 hover:bg-foreground/12 hover:text-foreground hover:opacity-100 focus-visible:opacity-100"
    >
      <Minimize2 className="size-3.5" strokeWidth={2} />
      Zen verlassen
    </button>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const uiZoom = useUiZoom((z) => z.zoom);
  const zenMode = useViewStore((s) => s.zenMode);
  const centeredLayout = useViewStore((s) => s.centeredLayout);
  useEffect(() => {
    document.documentElement.style.zoom = String(uiZoom);
  }, [uiZoom]);

  return (
    <>
      <AppHotkeys />
      <MonacoWorkspace />
      <FileSearch />
      <CommandPalette />
      <div className="flex h-screen w-screen flex-col">
        {!zenMode && <AppHeader />}
        <div className="flex min-h-0 flex-1">
          {!zenMode && <Sidebar />}
          <div className="flex min-w-0 flex-1 flex-col">
            <WorkspaceTrustBanner />
            <div className="flex min-h-0 min-w-0 flex-1">
              <div className="min-h-0 min-w-0 flex-1">
                {centeredLayout ? (
                  <div className="mx-auto flex h-full w-full max-w-[1100px] flex-col">
                    <Outlet />
                  </div>
                ) : (
                  <Outlet />
                )}
              </div>
              <BrowserPanel />
            </div>
            {!zenMode && <ProblemsSlot />}
            {!zenMode && <TerminalSlot />}
          </div>
        </div>
      </div>
      {zenMode && <ZenExit />}
      <RefactorDialogs />
      <Toaster />
      {RouterDevtools && (
        <Suspense fallback={null}>
          <RouterDevtools position="bottom-right" />
        </Suspense>
      )}
    </>
  );
}
