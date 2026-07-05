import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { AppHeader } from "@/components/app-header";
import { AppHotkeys } from "@/components/app-hotkeys";
import { FileSearch } from "@/components/file-search";
import { MonacoWorkspace } from "@/components/monaco-workspace";
import { Sidebar } from "@/components/sidebar";
import { TabBar } from "@/components/tab-bar/tab-bar";
import { TerminalPanel } from "@/components/terminal/terminal-panel";
import "../App.css";

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
            <TabBar />
            <div className="min-h-0 min-w-0 flex-1">
              <Outlet />
            </div>
            <TerminalPanel />
          </div>
        </div>
      </div>
      <TanStackRouterDevtools position="bottom-right" />
    </>
  );
}
