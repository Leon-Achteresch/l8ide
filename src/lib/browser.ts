import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useBrowserStore } from "@/lib/browser-store";
import { normalizeUrl } from "@/lib/url-normalize";

export type Rect = { x: number; y: number; width: number; height: number };

let wired = false;
function wire() {
  if (wired) return;
  wired = true;
  const store = useBrowserStore;
  void listen<string>("browser-url", (e) => store.getState().setUrl(e.payload));
  void listen<string>("browser-title", (e) => store.getState().setTitle(e.payload));
  void listen<boolean>("browser-loading", (e) => store.getState().setLoading(e.payload));
}

export function openBrowser(rect: Rect) {
  wire();
  return invoke("browser_open", { url: useBrowserStore.getState().url, ...rect });
}

export function setBrowserBounds(rect: Rect) {
  return invoke("browser_set_bounds", rect);
}

export function showBrowser(visible: boolean) {
  return invoke("browser_show", { visible });
}

export function navigateBrowser(input: string) {
  const url = normalizeUrl(input);
  if (url) return invoke("browser_navigate", { url });
}

export function browserEval(js: string) {
  return invoke("browser_eval", { js });
}

export function closeBrowser() {
  return invoke("browser_close");
}
