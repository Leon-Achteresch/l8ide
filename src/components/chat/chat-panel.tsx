import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleX,
  FileDiff,
  Loader2,
  Paperclip,
  Plus,
  Send,
  Sparkles,
  Square,
  Trash2,
  Undo2,
  Wrench,
  X,
} from "lucide-react";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Message, MessageContent } from "@/components/ui/message";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Markdown } from "@/components/chat/markdown";
import { open } from "@tauri-apps/plugin-dialog";
import { openAgentEditDiff, useAgentEdits } from "@/lib/agent-edits";
import { parseSlash, SLASH_COMMANDS } from "@/lib/chat-slash";
import { estimateEntriesTokens, formatTokens } from "@/lib/token-estimate";
import { type ChatEntry, useChatStore } from "@/lib/chat-store";
import { isPageTab, useWorkspaceStore } from "@/lib/workspace-store";
import { AI_MODELS, useAiSettings } from "@/lib/ai-settings";

const ICON_BUTTON =
  "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

export function ChatPanel() {
  const open = useChatStore((s) => s.open);
  if (!open) return null;
  return <ChatPanelInner />;
}

function ChatPanelInner() {
  const width = useChatStore((s) => s.width);
  const entries = useChatStore((s) => s.entries);
  const sessionTokens = useMemo(
    () => estimateEntriesTokens(entries),
    [entries],
  );
  const busy = useChatStore((s) => s.busy);
  const setWidth = useChatStore((s) => s.setWidth);
  const setOpen = useChatStore((s) => s.setOpen);
  const send = useChatStore((s) => s.send);
  const stop = useChatStore((s) => s.stop);
  const clear = useChatStore((s) => s.clear);
  const model = useAiSettings((s) => s.model);
  const setModel = useAiSettings((s) => s.setModel);

  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  function submit() {
    const text = draft;
    setDraft("");
    const parsed = parseSlash(text);
    if (parsed) {
      if (parsed.attachActivePath)
        useChatStore.getState().addAttachment(parsed.attachActivePath);
      void send(parsed.text);
    } else {
      void send(text);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function startResize(e: React.PointerEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;
    let x = startX;
    let frame = 0;
    const onMove = (ev: PointerEvent) => {
      x = ev.clientX;
      if (!frame) {
        frame = requestAnimationFrame(() => {
          frame = 0;
          setWidth(startWidth + startX - x);
        });
      }
    };
    const onUp = () => {
      if (frame) cancelAnimationFrame(frame);
      setWidth(startWidth + startX - x);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.cursor = "";
    };
    document.body.style.cursor = "col-resize";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div
      style={{ width }}
      className="relative flex shrink-0 flex-col border-l bg-background"
    >
      <div
        onPointerDown={startResize}
        className="absolute inset-y-0 -left-1.5 z-30 w-2 cursor-col-resize"
      />
      <div className="flex h-9 shrink-0 items-center gap-1.5 border-b px-2">
        <Sparkles className="size-4 text-primary" />
        <span className="text-xs font-medium">KI-Chat</span>
        {sessionTokens > 0 && (
          <span
            title="Geschätzte Tokens dieser Sitzung (grobe Näherung)"
            className="rounded bg-foreground/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
          >
            ~{formatTokens(sessionTokens)} tok
          </span>
        )}
        <NativeSelect
          size="sm"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="ml-1 min-w-0 flex-1"
          aria-label="Modell"
        >
          {AI_MODELS.map((m) => (
            <NativeSelectOption key={m.id} value={m.id}>
              {m.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <button
          type="button"
          onClick={clear}
          title="Verlauf löschen"
          className={ICON_BUTTON}
        >
          <Trash2 className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          title="Panel schließen"
          className={ICON_BUTTON}
        >
          <X className="size-4" />
        </button>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto scrollbar-thin p-3"
      >
        {entries.length === 0 && (
          <div className="mt-8 flex flex-col items-center gap-2 text-center text-muted-foreground">
            <Sparkles className="size-6" />
            <p className="text-sm">Frag mich etwas über dein Projekt.</p>
            <p className="text-xs">
              Ich kann Dateien lesen, durchsuchen und bearbeiten.
            </p>
          </div>
        )}
        {entries.map((entry) => (
          <EntryView key={entry.id} entry={entry} />
        ))}
        {busy && (
          <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Arbeitet…
          </div>
        )}
      </div>

      <div className="shrink-0 border-t p-2">
        {draft.startsWith("/") && !draft.includes(" ") && (
          <div className="mb-1.5 overflow-hidden rounded-lg bg-foreground/[0.03]">
            {SLASH_COMMANDS.filter((c) =>
              c.name.startsWith(draft.slice(1).toLowerCase()),
            ).map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setDraft(`/${c.name} `)}
                className="flex w-full items-baseline gap-2 px-2.5 py-1 text-left text-xs hover:bg-foreground/[0.05]"
              >
                <span className="font-mono font-medium text-violet-500">
                  /{c.name}
                </span>
                <span className="text-muted-foreground">{c.description}</span>
              </button>
            ))}
          </div>
        )}
        <AttachmentBar />
        <div className="relative">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Nachricht… (Enter zum Senden, Shift+Enter für Zeilenumbruch)"
            className="max-h-40 min-h-16 resize-none pr-11 text-sm"
          />
          {busy ? (
            <button
              type="button"
              onClick={stop}
              title="Stoppen"
              className="absolute bottom-2 right-2 inline-flex size-7 items-center justify-center rounded-md bg-destructive/15 text-destructive transition-colors hover:bg-destructive/25"
            >
              <Square className="size-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!draft.trim()}
              title="Senden"
              className="absolute bottom-2 right-2 inline-flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/85 disabled:opacity-40"
            >
              <Send className="size-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EntryView({ entry }: { entry: ChatEntry }) {
  if (entry.role === "user") {
    return (
      <Message align="end">
        <MessageContent>
          <Bubble variant="tinted" align="end">
            <BubbleContent className="whitespace-pre-wrap">{entry.text}</BubbleContent>
          </Bubble>
          {entry.attachments && entry.attachments.length > 0 && (
            <div className="mt-1 flex flex-wrap justify-end gap-1">
              {entry.attachments.map((name) => (
                <span
                  key={name}
                  className="inline-flex h-4.5 items-center gap-1 rounded bg-foreground/[0.05] px-1.5 text-[10px] text-muted-foreground"
                >
                  <Paperclip className="size-2.5" />
                  {name}
                </span>
              ))}
            </div>
          )}
        </MessageContent>
      </Message>
    );
  }
  if (entry.role === "assistant") {
    return (
      <Message align="start">
        <MessageContent>
          <Bubble variant="ghost" align="start">
            <BubbleContent>
              <Markdown content={entry.text} />
            </BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    );
  }
  if (entry.role === "error") {
    return (
      <Message align="start">
        <MessageContent>
          <Bubble variant="destructive" align="start">
            <BubbleContent className="whitespace-pre-wrap text-xs">
              {entry.text}
            </BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    );
  }
  return <ToolEntry entry={entry} />;
}

function AttachmentBar() {
  const attachments = useChatStore((s) => s.attachments);
  const addAttachment = useChatStore((s) => s.addAttachment);
  const removeAttachment = useChatStore((s) => s.removeAttachment);
  const activeFile = useWorkspaceStore((s) => s.activeFile);
  const rootPath = useWorkspaceStore((s) => s.rootPath);

  const canAttachActive = Boolean(
    activeFile && !isPageTab(activeFile) && !attachments.includes(activeFile),
  );

  const pickFiles = async () => {
    const selected = await open({
      multiple: true,
      defaultPath: rootPath ?? undefined,
    });
    for (const p of Array.isArray(selected) ? selected : selected ? [selected] : [])
      addAttachment(p);
  };

  return (
    <div className="mb-1.5 flex flex-wrap items-center gap-1">
      {attachments.map((p) => (
        <span
          key={p}
          className="inline-flex h-5 items-center gap-1 rounded-md bg-foreground/[0.06] pl-1.5 pr-0.5 text-[11px] text-foreground"
        >
          <Paperclip className="size-2.5 text-muted-foreground" />
          <span className="max-w-32 truncate">{p.split("/").pop()}</span>
          <button
            type="button"
            onClick={() => removeAttachment(p)}
            className="inline-flex size-4 items-center justify-center rounded text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
          >
            <X className="size-2.5" />
          </button>
        </span>
      ))}
      {canAttachActive && (
        <button
          type="button"
          onClick={() => activeFile && addAttachment(activeFile)}
          className="inline-flex h-5 items-center gap-1 rounded-md px-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground"
        >
          <Plus className="size-2.5" />
          Aktive Datei
        </button>
      )}
      <button
        type="button"
        onClick={() => void pickFiles()}
        className="inline-flex h-5 items-center gap-1 rounded-md px-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground"
      >
        <Paperclip className="size-2.5" />
        Datei…
      </button>
    </div>
  );
}

function EditActions({ editId }: { editId: string }) {
  const edit = useAgentEdits((s) => s.edits[editId]);
  const revert = useAgentEdits((s) => s.revert);
  if (!edit) return null;
  return (
    <div className="flex items-center gap-1 border-t px-2 py-1">
      <button
        type="button"
        onClick={() => openAgentEditDiff(editId)}
        className="inline-flex h-5 items-center gap-1 rounded px-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground"
      >
        <FileDiff className="size-3" />
        Diff
      </button>
      {edit.reverted ? (
        <span className="ml-auto text-[10px] text-muted-foreground">
          Rückgängig gemacht
        </span>
      ) : (
        <button
          type="button"
          onClick={() => void revert(editId)}
          className="ml-auto inline-flex h-5 items-center gap-1 rounded px-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-red-500"
        >
          <Undo2 className="size-3" />
          Rückgängig
        </button>
      )}
    </div>
  );
}

function summarizeArgs(name: string, args: unknown): string {
  const a = (args ?? {}) as Record<string, unknown>;
  if (name === "read_file" || name === "edit_file" || name === "create_file")
    return String(a.path ?? "");
  if (name === "search") return String(a.query ?? "");
  if (name === "run_command") return String(a.command ?? "");
  return "";
}

function ToolEntry({ entry }: { entry: Extract<ChatEntry, { role: "tool" }> }) {
  const [expanded, setExpanded] = useState(false);
  const pending = entry.result === undefined;
  const failed = !pending && /^FEHLER/.test(entry.result ?? "");
  const summary = summarizeArgs(entry.name, entry.args);
  return (
    <div className="rounded-md border bg-muted/30 text-xs">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left"
      >
        {pending ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
        ) : failed ? (
          <CircleX className="size-3.5 shrink-0 text-destructive" />
        ) : (
          <CircleCheck className="size-3.5 shrink-0 text-emerald-500" />
        )}
        <Wrench className="size-3 shrink-0 text-muted-foreground" />
        <span className="font-mono font-medium">{entry.name}</span>
        {summary && (
          <span className="truncate font-mono text-muted-foreground">{summary}</span>
        )}
        {!pending &&
          (expanded ? (
            <ChevronDown className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
          ))}
      </button>
      {entry.editId && <EditActions editId={entry.editId} />}
      {expanded && entry.result !== undefined && (
        <pre className="max-h-52 overflow-auto border-t px-2 py-1.5 font-mono text-[11px] text-muted-foreground">
          {entry.result}
        </pre>
      )}
    </div>
  );
}
