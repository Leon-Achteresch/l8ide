import { toast } from "sonner";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type NotificationKind = "success" | "error" | "warning" | "info";

export type NotificationItem = {
  id: number;
  kind: NotificationKind;
  text: string;
  time: number;
};

const MAX_ITEMS = 100;
let nextId = 1;

type NotificationsStore = {
  items: NotificationItem[];
  unread: number;
  dnd: boolean;
  add: (kind: NotificationKind, text: string) => void;
  markRead: () => void;
  clear: () => void;
  setDnd: (dnd: boolean) => void;
};

export const useNotifications = create<NotificationsStore>()(
  persist(
    (set) => ({
      items: [],
      unread: 0,
      dnd: false,
      add: (kind, text) =>
        set((s) => ({
          items: [
            { id: nextId++, kind, text, time: Date.now() },
            ...s.items,
          ].slice(0, MAX_ITEMS),
          unread: s.unread + 1,
        })),
      markRead: () => set({ unread: 0 }),
      clear: () => set({ items: [], unread: 0 }),
      setDnd: (dnd) => set({ dnd }),
    }),
    { name: "notifications", partialize: (s) => ({ dnd: s.dnd }) },
  ),
);

let patched = false;

export function initNotificationCapture() {
  if (patched) return;
  patched = true;
  const kinds: NotificationKind[] = ["success", "error", "warning", "info"];
  for (const kind of kinds) {
    const original = toast[kind].bind(toast);
    toast[kind] = ((message: Parameters<typeof original>[0], data?: Parameters<typeof original>[1]) => {
      const store = useNotifications.getState();
      if (typeof message === "string") store.add(kind, message);
      if (store.dnd && kind !== "error") return -1;
      return original(message, data);
    }) as typeof original;
  }
}
