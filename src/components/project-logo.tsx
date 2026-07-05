import { convertFileSrc } from "@tauri-apps/api/core";
import { findProjectLogo } from "@/lib/project-logo";
import { useProjectLogoStore } from "@/lib/project-logo-store";
import { cn } from "@/lib/utils";
import { FolderOpen } from "lucide-react";
import { useEffect, useState } from "react";

type ProjectLogoProps = {
  rootPath: string;
  className?: string;
};

export function ProjectLogo({ rootPath, className }: ProjectLogoProps) {
  const version = useProjectLogoStore((s) => s.version);
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void findProjectLogo(rootPath).then((path) => {
      if (!cancelled) setLogo(path);
    });
    return () => {
      cancelled = true;
    };
  }, [rootPath, version]);

  if (!logo) {
    return (
      <FolderOpen
        className={cn("size-4 shrink-0 text-muted-foreground", className)}
      />
    );
  }

  return (
    <img
      src={convertFileSrc(logo)}
      alt=""
      className={cn("size-4 shrink-0 rounded-sm object-contain", className)}
    />
  );
}
