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

export function browserDevtools() {
  return invoke("browser_devtools");
}

const PICKER_SCRIPT = `(function () {
  if (window.__l8Pick) return;
  window.__l8Pick = true;
  var prev = null;
  var prevOutline = "";
  function selector(el) {
    var parts = [];
    var node = el;
    for (var depth = 0; node && node.nodeType === 1 && depth < 4; depth++) {
      if (node.id) {
        parts.unshift("#" + node.id);
        break;
      }
      var part = node.tagName.toLowerCase();
      var cls = (node.className && typeof node.className === "string")
        ? node.className.trim().split(/\\s+/).slice(0, 2).join(".")
        : "";
      if (cls) part += "." + cls;
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(" > ");
  }
  function restore() {
    if (prev) prev.style.outline = prevOutline;
    prev = null;
  }
  function over(e) {
    restore();
    prev = e.target;
    prevOutline = prev.style.outline;
    prev.style.outline = "2px solid #8b5cf6";
  }
  function click(e) {
    e.preventDefault();
    e.stopPropagation();
    var el = e.target;
    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    console.log(
      "[Element] " + selector(el) +
      " — " + Math.round(r.width) + "×" + Math.round(r.height) + "px" +
      " · " + cs.display + "/" + cs.position +
      " · font " + cs.fontSize +
      " · farbe " + cs.color
    );
    cleanup();
  }
  function key(e) {
    if (e.key === "Escape") cleanup();
  }
  function cleanup() {
    restore();
    document.removeEventListener("mouseover", over, true);
    document.removeEventListener("click", click, true);
    document.removeEventListener("keydown", key, true);
    window.__l8Pick = false;
  }
  document.addEventListener("mouseover", over, true);
  document.addEventListener("click", click, true);
  document.addEventListener("keydown", key, true);
})();`;

export function pickElement() {
  return invoke("browser_eval", { js: PICKER_SCRIPT });
}

export function closeBrowser() {
  return invoke("browser_close");
}
