import {
  Bot,
  Bug,
  FolderGit2,
  Globe,
  Rocket,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { runCommand } from "@/lib/command-registry";

type Item = { cmd: string; label: string; hint: string };
type Section = { icon: LucideIcon; title: string; items: Item[] };

const SECTIONS: Section[] = [
  {
    icon: Bot,
    title: "KI",
    items: [
      { cmd: "chat.toggle", label: "KI-Chat", hint: "⌘L · /explain /fix /test" },
      { cmd: "command.palette", label: "Alles finden", hint: "⌘⇧P" },
    ],
  },
  {
    icon: Bug,
    title: "Debuggen",
    items: [
      { cmd: "debug.file", label: "Datei debuggen", hint: "⌘⌥B" },
      { cmd: "debug.attach", label: "An Node hängen", hint: "⌘⌥D" },
    ],
  },
  {
    icon: Globe,
    title: "Web",
    items: [
      { cmd: "browser.toggle", label: "Browser", hint: "⌘⇧B · Konsole, DevTools" },
      { cmd: "processes.dashboard", label: "Dev-Prozesse", hint: "⌘⌥J" },
      { cmd: "design.tokens", label: "Design-Tokens", hint: "⌘⌥T" },
    ],
  },
  {
    icon: FolderGit2,
    title: "Git",
    items: [
      { cmd: "git.history", label: "Verlauf", hint: "⌘⌥L · Cherry-Pick, Revert" },
      { cmd: "git.stashes", label: "Stashes", hint: "⌘⌥S" },
      { cmd: "git.worktrees", label: "Worktrees", hint: "⌘⌥O" },
    ],
  },
  {
    icon: Rocket,
    title: "Navigieren & Verstehen",
    items: [
      { cmd: "project.graph", label: "Projekt-Graph", hint: "⌘⌥G" },
      { cmd: "file.deps", label: "Abhängigkeiten", hint: "⌘⌥I" },
      { cmd: "search.structural", label: "Strukturelle Suche", hint: "⌘⇧S" },
    ],
  },
];

export function WelcomePage() {
  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="flex items-center gap-2.5">
          <Sparkles className="size-6 text-violet-500" />
          <h1 className="text-xl font-semibold text-foreground">l8ide</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Deine Umgebung für Webentwicklung — Editor, Debugger, Git und KI in
          einem. Ein Klick startet, ⌘⇧P findet alles.
        </p>
        <div className="mt-8 space-y-6">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <section.icon className="size-3.5" />
                {section.title}
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {section.items.map((item) => (
                  <button
                    key={item.cmd}
                    type="button"
                    onClick={() => runCommand(item.cmd)}
                    className="rounded-xl bg-foreground/[0.03] px-3 py-2.5 text-left transition-colors hover:bg-foreground/[0.07]"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {item.label}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {item.hint}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
