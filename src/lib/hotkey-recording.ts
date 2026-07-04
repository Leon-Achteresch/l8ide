import { create } from "zustand";

export const useHotkeyRecording = create<{
  isRecording: boolean;
  setRecording: (isRecording: boolean) => void;
}>((set) => ({
  isRecording: false,
  setRecording: (isRecording) => set({ isRecording }),
}));
