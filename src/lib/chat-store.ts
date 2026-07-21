import { readTextFile } from "@tauri-apps/plugin-fs";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { runAgent, type ChatMessage } from "@/lib/ai/agent";
import { createOpenRouterLlm } from "@/lib/ai/openrouter";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { getCustomInstructions } from "@/lib/ai/custom-instructions";
import { TOOLS } from "@/lib/ai/tools";
import { workspaceFs } from "@/lib/ai/workspace-fs";
import { useAgentEdits } from "@/lib/agent-edits";
import { useAiSettings } from "@/lib/ai-settings";
import { useWorkspaceStore } from "@/lib/workspace-store";

export type ChatEntry =
  | { id: string; role: "user"; text: string; attachments?: string[] }
  | { id: string; role: "assistant"; text: string }
  | {
      id: string;
      role: "tool";
      name: string;
      args: unknown;
      result?: string;
      editId?: string;
    }
  | { id: string; role: "error"; text: string };

type ChatStore = {
  open: boolean;
  width: number;
  entries: ChatEntry[];
  busy: boolean;
  attachments: string[];
  addAttachment: (path: string) => void;
  removeAttachment: (path: string) => void;
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
        attachments: [],
        addAttachment: (path) =>
          set((s) =>
            s.attachments.includes(path)
              ? s
              : { attachments: [...s.attachments, path] },
          ),
        removeAttachment: (path) =>
          set((s) => ({
            attachments: s.attachments.filter((p) => p !== path),
          })),
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

          const ws = useWorkspaceStore.getState();
          const attachments = get().attachments;
          const attachmentNames = attachments.map(
            (p) => p.split("/").pop() ?? p,
          );
          let attachmentBlock = "";
          for (const abs of attachments) {
            const rel =
              ws.rootPath && abs.startsWith(`${ws.rootPath}/`)
                ? abs.slice(ws.rootPath.length + 1)
                : abs;
            const content = await readTextFile(abs).catch(() => null);
            if (content === null) continue;
            const capped =
              content.length > 16000
                ? `${content.slice(0, 16000)}\n… [gekürzt]`
                : content;
            attachmentBlock += `=== Angehängte Datei: ${rel} ===\n${capped}\n\n`;
          }

          set((s) => ({
            entries: [
              ...s.entries,
              {
                id: uid(),
                role: "user",
                text: trimmed,
                ...(attachmentNames.length
                  ? { attachments: attachmentNames }
                  : {}),
              },
            ],
            attachments: [],
            busy: true,
          }));

          const history: ChatMessage[] = [
            {
              role: "system",
              content: buildSystemPrompt({
                rootPath: ws.rootPath,
                activeFile: ws.activeFile,
                openFiles: ws.tabs,
                customInstructions: getCustomInstructions(),
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
          if (attachmentBlock) {
            history[history.length - 1] = {
              role: "user",
              content: `${attachmentBlock}${trimmed}`,
            };
          }

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
                const isEdit =
                  (ev.name === "edit_file" || ev.name === "create_file") &&
                  ev.result.startsWith("OK");
                const editId = isEdit
                  ? (useAgentEdits.getState().lastId ?? undefined)
                  : undefined;
                set((s) => ({
                  entries: s.entries.map((e) =>
                    e.id === ev.id && e.role === "tool"
                      ? { ...e, result: ev.result, editId }
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
