import { useState } from "react";
import {
  Bot,
  Bug,
  FolderGit2,
  Globe,
  Rocket,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { runCommand } from "@/lib/command-registry";
import { cn } from "@/lib/utils";

type Item = { cmd: string; label: string; hint: string };
type Section = {
  icon: LucideIcon;
  title: string;
  gradient: string;
  items: Item[];
};

const SECTIONS: Section[] = [
  {
    icon: Bot,
    title: "KI",
    gradient: "from-violet-400/70 via-fuchsia-300/60 to-sky-300/60",
    items: [
      { cmd: "chat.toggle", label: "KI-Chat", hint: "⌘L · /explain /fix /test" },
      { cmd: "command.palette", label: "Alles finden", hint: "⌘⇧P" },
    ],
  },
  {
    icon: Bug,
    title: "Debuggen",
    gradient: "from-rose-400/70 via-orange-300/60 to-amber-300/60",
    items: [
      { cmd: "debug.file", label: "Datei debuggen", hint: "⌘⌥B" },
      { cmd: "debug.attach", label: "An Node hängen", hint: "⌘⌥D" },
    ],
  },
  {
    icon: Globe,
    title: "Web",
    gradient: "from-sky-400/70 via-cyan-300/60 to-emerald-300/50",
    items: [
      { cmd: "browser.toggle", label: "Browser", hint: "⌘⇧B · Konsole, DevTools" },
      { cmd: "processes.dashboard", label: "Dev-Prozesse", hint: "⌘⌥J" },
      { cmd: "design.tokens", label: "Design-Tokens", hint: "⌘⌥T" },
    ],
  },
  {
    icon: FolderGit2,
    title: "Git",
    gradient: "from-emerald-400/70 via-teal-300/60 to-cyan-300/50",
    items: [
      { cmd: "git.history", label: "Verlauf", hint: "⌘⌥L · Cherry-Pick, Revert" },
      { cmd: "git.stashes", label: "Stashes", hint: "⌘⌥S" },
      { cmd: "git.worktrees", label: "Worktrees", hint: "⌘⌥O" },
    ],
  },
  {
    icon: Rocket,
    title: "Navigieren",
    gradient: "from-amber-400/70 via-orange-300/60 to-rose-300/55",
    items: [
      { cmd: "project.graph", label: "Projekt-Graph", hint: "⌘⌥G" },
      { cmd: "file.deps", label: "Abhängigkeiten", hint: "⌘⌥I" },
      { cmd: "search.structural", label: "Strukturelle Suche", hint: "⌘⇧S" },
    ],
  },
];

const ALL = "Alle";

export function WelcomePage() {
  const [filter, setFilter] = useState(ALL);
  const shown = SECTIONS.filter((s) => filter === ALL || s.title === filter);
  const cards = shown.flatMap((section) =>
    section.items.map((item) => ({ section, item })),
  );

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center gap-2.5">
          <Sparkles className="size-6 text-violet-500" />
          <h1 className="text-xl font-semibold text-foreground">l8ide</h1>
        </div>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
          Deine Umgebung für Webentwicklung — Editor, Debugger, Git und KI in
          einem. Ein Klick startet, ⌘⇧P findet alles.
        </p>

        <div className="mt-6 flex flex-wrap gap-1.5">
          {[ALL, ...SECTIONS.map((s) => s.title)].map((name) => {
            const active = filter === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setFilter(name)}
                className={cn(
                  "relative rounded-full px-3 py-1 text-xs font-medium transition-colors duration-150",
                  active
                    ? "text-background"
                    : "text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="welcome-filter-pill"
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                    className="absolute inset-0 -z-10 rounded-full bg-foreground"
                    aria-hidden
                  />
                )}
                {name}
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ section, item }) => (
            <motion.button
              key={item.cmd}
              layout
              type="button"
              onClick={() => runCommand(item.cmd)}
              whileTap={{ scale: 0.985 }}
              transition={{ type: "spring", stiffness: 500, damping: 40 }}
              className="group overflow-hidden rounded-2xl bg-card text-left shadow-panel transition-shadow duration-200 hover:shadow-float"
            >
              <div
                className={cn(
                  "flex h-20 items-end bg-gradient-to-br p-3",
                  section.gradient,
                )}
              >
                <span className="flex size-9 items-center justify-center rounded-xl bg-background/85 shadow-panel backdrop-blur-sm">
                  <section.icon
                    className="size-4.5 text-foreground/80"
                    strokeWidth={2}
                  />
                </span>
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-medium text-foreground">
                  {item.label}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {item.hint}
                </p>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                  {section.title}
                </p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
