import { isTauri } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { useEffect } from "react";
import { toast } from "sonner";

export function UpdateCheck() {
  useEffect(() => {
    if (!import.meta.env.PROD || !isTauri()) return;

    let cancelled = false;
    void check()
      .then((update) => {
        if (!update || cancelled) return;

        toast.info(`l8ide ${update.version} ist verfügbar`, {
          description: update.body || "Eine neue Version kann installiert werden.",
          duration: Infinity,
          action: {
            label: "Installieren",
            onClick: () => {
              const id = toast.loading("Update wird heruntergeladen …");
              let downloaded = 0;
              let total = 0;

              void update
                .downloadAndInstall((event) => {
                  if (event.event === "Started") {
                    total = event.data.contentLength ?? 0;
                  } else if (event.event === "Progress") {
                    downloaded += event.data.chunkLength;
                    if (total > 0) {
                      toast.loading(
                        `Update wird heruntergeladen: ${Math.floor((downloaded / total) * 100)} %`,
                        { id },
                      );
                    }
                  }
                })
                .then(async () => {
                  toast.success("Update installiert. l8ide startet neu …", { id });
                  await relaunch();
                })
                .catch((error) => {
                  toast.error(`Update fehlgeschlagen: ${String(error)}`, { id });
                });
            },
          },
        });
      })
      .catch((error) => {
        console.warn("Update-Prüfung fehlgeschlagen", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
