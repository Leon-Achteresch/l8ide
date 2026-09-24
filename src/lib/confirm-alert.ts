import { create } from "zustand";

type Confirmation = {
  title: string;
  description: string;
  action: string;
  resolve: (confirmed: boolean) => void;
};

type ConfirmationState = {
  queue: Confirmation[];
  answer: (confirmed: boolean) => void;
};

export const useConfirmation = create<ConfirmationState>((set, get) => ({
  queue: [],
  answer: (confirmed) => {
    const [current] = get().queue;
    if (!current) return;
    set((state) => ({ queue: state.queue.slice(1) }));
    current.resolve(confirmed);
  },
}));

export function confirmAlert(description: string, title: string, action: string): Promise<boolean> {
  return new Promise((resolve) => {
    useConfirmation.setState((state) => ({
      queue: [...state.queue, { title, description, action, resolve }],
    }));
  });
}
