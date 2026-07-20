import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";
import { useBrowserStore } from "@/lib/browser-store";

export type DevPort = { port: number; process: string; pid: number };

export async function killPort(pid: number) {
  await invoke("kill_process", { pid }).catch(() => {});
  const ports = await invoke<DevPort[]>("list_dev_ports").catch(
    () => [] as DevPort[],
  );
  usePortsStore.setState({ ports });
}

const POLL_MS = 5000;

type PortsStore = { ports: DevPort[] };

export const usePortsStore = create<PortsStore>(() => ({ ports: [] }));

let started = false;

export function initPortsPolling() {
  if (started) return;
  started = true;
  const poll = async () => {
    if (!document.hidden) {
      const ports = await invoke<DevPort[]>("list_dev_ports").catch(
        () => [] as DevPort[],
      );
      const prev = usePortsStore.getState().ports;
      if (
        ports.length !== prev.length ||
        ports.some((p, i) => p.port !== prev[i]?.port)
      ) {
        usePortsStore.setState({ ports });
      }
    }
    setTimeout(() => void poll(), POLL_MS);
  };
  void poll();
}

export function openPortInBrowser(port: number) {
  const browser = useBrowserStore.getState();
  browser.setUrl(`http://localhost:${port}/`);
  if (!browser.open) {
    browser.setOpen(true);
  } else {
    void import("@/lib/browser").then((m) =>
      m.navigateBrowser(`http://localhost:${port}/`),
    );
  }
}
