import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { AppHeader } from "@/components/app-header";
import { Sidebar } from "@/components/sidebar";
import { TabBar } from "@/components/tab-bar";
import "../App.css";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <>
      <div className="flex h-screen w-screen flex-col">
        <AppHeader />
        <div className="flex min-h-0 flex-1">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <TabBar />
            <div className="min-h-0 min-w-0 flex-1">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
      <TanStackRouterDevtools position="bottom-right" />
    </>
  );
}
