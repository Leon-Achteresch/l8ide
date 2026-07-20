import { createRootRoute, Outlet } from "@tanstack/react-router";
import { AppHeader } from "@/components/app-header/app-header";
import { AppHotkeys } from "@/components/app-hotkeys";
import { closeBrowser } from "@/lib/browser";
import { useBrowserStore } from "@/lib/browser-store";
import { useChatStore } from "@/lib/chat-store";
import { FileSearch } from "@/components/file-search";
import { CommandPalette } from "@/components/command-palette";
import { MonacoWorkspace } from "@/components/monaco-workspace";
import { LocalHistoryDialog } from "@/components/local-history-dialog";
import { RefactorDialogs } from "@/components/refactor-preview-dialog";
import { BreakpointConditionDialog } from "@/components/breakpoint-condition-dialog";
import { CallHierarchyDialog } from "@/components/call-hierarchy-dialog";
import { DebugIsland } from "@/components/debug-island";
import { FileDepsDialog } from "@/components/file-deps-dialog";
import { StructSearchDialog } from "@/components/struct-search-dialog";
import { HttpClientPanel } from "@/components/http-client-panel";
import { ReflogDialog } from "@/components/reflog-dialog";
import { WorktreeDialog } from "@/components/worktree-dialog";
import { StashDialog } from "@/components/stash-dialog";
import { RemotesDialog } from "@/components/remotes-dialog";
import { ClipboardHistoryDialog } from "@/components/clipboard-history-dialog";
import { WorkContextsDialog } from "@/components/work-contexts-dialog";
import { ScreencastOverlay } from "@/components/screencast-overlay";
import { Sidebar } from "@/components/sidebar";
import { StatusBar } from "@/components/status-bar";
import { Toaster } from "@/components/ui/sonner";
import { WorkspaceTrustBanner } from "@/components/workspace-trust-banner";
import { useProblemsPanel } from "@/lib/markers-store";
import { useTerminalStore } from "@/lib/terminal-store";
import { useUiZoom } from "@/lib/ui-zoom";
import { useViewStore } from "@/lib/view-store";
import { SPRING_PANEL } from "@/lib/ease";
import { Minimize2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
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

const ChatPanel = lazy(() =>
  import("@/components/chat/chat-panel").then((m) => ({
    default: m.ChatPanel,
  })),
);

const BrowserPanel = lazy(() =>
  import("@/components/browser/browser-panel").then((m) => ({
    default: m.BrowserPanel,
  })),
);

function ChatSlot() {
  const open = useChatStore((s) => s.open);
  if (!open) return null;
  return (
    <Suspense fallback={null}>
      <ChatPanel />
    </Suspense>
  );
}

function BrowserSlot() {
  const open = useBrowserStore((s) => s.open);
  useEffect(() => {
    if (!useBrowserStore.getState().open) void closeBrowser();
  }, []);
  if (!open) return null;
  return (
    <Suspense fallback={null}>
      <BrowserPanel />
    </Suspense>
  );
}

const RouterDevtools = import.meta.env.DEV
  ? lazy(() =>
      import("@tanstack/react-router-devtools").then((m) => ({
        default: m.TanStackRouterDevtools,
      })),
    )
  : null;

function BottomSlot({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={SPRING_PANEL}
          className="shrink-0 overflow-hidden"
        >
          <Suspense fallback={null}>{children}</Suspense>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TerminalSlot() {
  const open = useTerminalStore((s) => s.open);
  return (
    <BottomSlot open={open}>
      <TerminalPanel />
    </BottomSlot>
  );
}

function ProblemsSlot() {
  const open = useProblemsPanel((s) => s.open);
  return (
    <BottomSlot open={open}>
      <ProblemsPanel />
    </BottomSlot>
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
              <BrowserSlot />
              <ChatSlot />
            </div>
            {!zenMode && <ProblemsSlot />}
            {!zenMode && <TerminalSlot />}
          </div>
        </div>
        {!zenMode && <StatusBar />}
      </div>
      {zenMode && <ZenExit />}
      <RefactorDialogs />
      <LocalHistoryDialog />
      <ClipboardHistoryDialog />
      <CallHierarchyDialog />
      <WorkContextsDialog />
      <ScreencastOverlay />
      <DebugIsland />
      <BreakpointConditionDialog />
      <FileDepsDialog />
      <StructSearchDialog />
      <HttpClientPanel />
      <ReflogDialog />
      <WorktreeDialog />
      <StashDialog />
      <RemotesDialog />
      <Toaster />
      {RouterDevtools && (
        <Suspense fallback={null}>
          <RouterDevtools position="bottom-right" />
        </Suspense>
      )}
    </>
  );
}
