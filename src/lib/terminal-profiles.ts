import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { type Profile, useTerminalStore } from "@/lib/terminal-store";

type BackendProfile = { id: string; label: string; path: string; args: string[] };

let cache: Profile[] | null = null;
let inflight: Promise<Profile[]> | null = null;

export async function loadDetectedProfiles(): Promise<Profile[]> {
  if (cache) return cache;
  if (!inflight) {
    inflight = invoke<BackendProfile[]>("pty_profiles")
      .then((list) => {
        cache = list.map((p) => ({
          id: p.id,
          label: p.label,
          path: p.path,
          args: p.args,
        }));
        return cache;
      })
      .catch(() => {
        cache = [];
        return cache;
      });
  }
  return inflight;
}

export function resolveProfile(
  profileId: string,
  detected: Profile[],
  custom: Profile[],
): Profile | null {
  if (profileId === "default") return null;
  return (
    detected.find((p) => p.id === profileId) ??
    custom.find((p) => p.id === profileId) ??
    null
  );
}

export function useProfiles(): Profile[] {
  const custom = useTerminalStore((s) => s.customProfiles);
  const [detected, setDetected] = useState<Profile[]>(cache ?? []);
  useEffect(() => {
    void loadDetectedProfiles().then(setDetected);
  }, []);
  return [...detected, ...custom];
}
