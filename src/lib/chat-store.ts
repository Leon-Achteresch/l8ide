import { create } from "zustand";
import { persist } from "zustand/middleware";
import { runAgent, type ChatMessage } from "@/lib/ai/agent";
import { createOpenRouterLlm } from "@/lib/ai/openrouter";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { TOOLS } from "@/lib/ai/tools";
import { workspaceFs } from "@/lib/ai/workspace-fs";
import { useAiSettings } from "@/lib/ai-settings";
import { useWorkspaceStore } from "@/lib/workspace-store";

export type ChatEntry =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; text: string }
  | { id: string; role: "tool"; name: string; args: unknown; result?: string }
  | { id: string; role: "error"; text: string };

type ChatStore = {
  open: boolean;
  width: number;
  entries: ChatEntry[];
  busy: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
  setWidth: (width: number) => void;
  clear: () => void;
  stop: () => void;
  send: (text: string) => Promise<void>;
};

const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random()}`;

let controller: AbortController | null = null;

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => {
      // Streaming-Zustand außerhalb des Stores: die id des aktuell wachsenden
      // Assistant-Eintrags der laufenden Runde.
      let streamingId: string | null = null;

      const upsertAssistant = (chunk: string) => {
        set((s) => {
          if (streamingId) {
            return {
              entries: s.entries.map((e) =>
                e.id === streamingId && e.role === "assistant"
                  ? { ...e, text: e.text + chunk }
                  : e,
              ),
            };
          }
          streamingId = uid();
          return {
            entries: [...s.entries, { id: streamingId, role: "assistant", text: chunk }],
          };
        });
      };

      return {
        open: false,
        width: 420,
        entries: [],
        busy: false,
        toggle: () => set((s) => ({ open: !s.open })),
        setOpen: (open) => set({ open }),
        setWidth: (width) =>
          set({ width: Math.max(320, Math.min(window.innerWidth - 280, width)) }),
        clear: () => set({ entries: [] }),
        stop: () => {
          controller?.abort();
          set({ busy: false });
        },

        async send(text) {
          const trimmed = text.trim();
          if (!trimmed || get().busy) return;

          const { apiKey, model } = useAiSettings.getState();
          if (!apiKey) {
            set((s) => ({
              entries: [
                ...s.entries,
                { id: uid(), role: "user", text: trimmed },
                {
                  id: uid(),
                  role: "error",
                  text: "Kein OpenRouter-API-Key hinterlegt. Einstellungen → KI.",
                },
              ],
            }));
            return;
          }

          set((s) => ({
            entries: [...s.entries, { id: uid(), role: "user", text: trimmed }],
            busy: true,
          }));

          const ws = useWorkspaceStore.getState();
          const history: ChatMessage[] = [
            {
              role: "system",
              content: buildSystemPrompt({
                rootPath: ws.rootPath,
                activeFile: ws.activeFile,
                openFiles: ws.tabs,
              }),
            },
            // vorherige Konversation (nur user/assistant-Text) mitgeben
            ...get()
              .entries.filter(
                (e): e is Extract<ChatEntry, { role: "user" | "assistant" }> =>
                  e.role === "user" || e.role === "assistant",
              )
              .map((e) => ({ role: e.role, content: e.text }) as ChatMessage),
          ];

          controller = new AbortController();
          streamingId = null;

          const llm = createOpenRouterLlm({
            apiKey,
            model,
            signal: controller.signal,
            onContentDelta: upsertAssistant,
          });

          await runAgent({
            messages: history,
            tools: TOOLS,
            fs: workspaceFs,
            llm,
            signal: controller.signal,
            onEvent: (ev) => {
              if (ev.type === "assistant") {
                streamingId = null; // Runde abgeschlossen
              } else if (ev.type === "tool_call") {
                streamingId = null; // vor Tool: Assistant-Eintrag finalisieren
                set((s) => ({
                  entries: [
                    ...s.entries,
                    { id: ev.id, role: "tool", name: ev.name, args: ev.args },
                  ],
                }));
              } else if (ev.type === "tool_result") {
                set((s) => ({
                  entries: s.entries.map((e) =>
                    e.id === ev.id && e.role === "tool"
                      ? { ...e, result: ev.result }
                      : e,
                  ),
                }));
              } else if (ev.type === "error") {
                set((s) => ({
                  entries: [...s.entries, { id: uid(), role: "error", text: ev.message }],
                }));
              }
            },
          });

          set({ busy: false });
        },
      };
    },
    {
      name: "chat-store",
      partialize: (s) => ({ open: s.open, width: s.width }),
    },
  ),
);
