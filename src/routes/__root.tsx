import { createRootRoute, Outlet } from "@tanstack/react-router";
import { AppHeader } from "@/components/app-header/app-header";
import { AppHotkeys } from "@/components/app-hotkeys";
import { BrowserPanel } from "@/components/browser/browser-panel";
import { FileSearch } from "@/components/file-search";
import { MonacoWorkspace } from "@/components/monaco-workspace";
import { Sidebar } from "@/components/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { WorkspaceTrustBanner } from "@/components/workspace-trust-banner";
import { useTerminalStore } from "@/lib/terminal-store";
import { lazy, Suspense } from "react";
import "../App.css";

const TerminalPanel = lazy(() =>
  import("@/components/terminal/terminal-panel").then((m) => ({
    default: m.TerminalPanel,
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

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <>
      <AppHotkeys />
      <MonacoWorkspace />
      <FileSearch />
      <div className="flex h-screen w-screen flex-col">
        <AppHeader />
        <div className="flex min-h-0 flex-1">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <WorkspaceTrustBanner />
            <div className="flex min-h-0 min-w-0 flex-1">
              <div className="min-h-0 min-w-0 flex-1">
                <Outlet />
              </div>
              <BrowserPanel />
            </div>
            <TerminalSlot />
          </div>
        </div>
      </div>
      <Toaster />
      {RouterDevtools && (
        <Suspense fallback={null}>
          <RouterDevtools position="bottom-right" />
        </Suspense>
      )}
    </>
  );
}
