import { create } from "zustand";
import { persist } from "zustand/middleware";

// Modell-Auswahl für die verbleibenden KI-Funktionen.
export const AI_MODELS = [
  { id: "xiaomi/mimo-v2.5", label: "MiMo v2.5 (bestes P/L)" },
  { id: "openai/gpt-5.1-codex-mini", label: "GPT-5.1 Codex mini (zuverlässig)" },
  { id: "minimax/minimax-m3", label: "MiniMax M3 (schnell)" },
  { id: "deepseek/deepseek-v4-pro", label: "DeepSeek v4 Pro" },
  { id: "nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron 3 Super (free)" },
] as const;

type AiSettings = {
  apiKey: string;
  model: string;
  inlineCompletions: boolean;
  setApiKey: (apiKey: string) => void;
  setModel: (model: string) => void;
  setInlineCompletions: (enabled: boolean) => void;
};

export const useAiSettings = create<AiSettings>()(
  persist(
    (set) => ({
      apiKey: "",
      model: AI_MODELS[0].id,
      inlineCompletions: false,
      setApiKey: (apiKey) => set({ apiKey }),
      setModel: (model) => set({ model }),
      setInlineCompletions: (inlineCompletions) => set({ inlineCompletions }),
    }),
    { name: "ai-settings" },
  ),
);
