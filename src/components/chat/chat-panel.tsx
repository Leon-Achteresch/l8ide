import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleX,
  FileDiff,
  Loader2,
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
import { openAgentEditDiff, useAgentEdits } from "@/lib/agent-edits";
import { type ChatEntry, useChatStore } from "@/lib/chat-store";
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
    void send(text);
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
