import { convertFileSrc } from "@tauri-apps/api/core";
import {
  findProjectLogo,
  pickProjectLogo,
  type ProjectLogoPaths,
} from "@/lib/project-logo";
import { useProjectLogoStore } from "@/lib/project-logo-store";
import { cn } from "@/lib/utils";
import { FolderOpen } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

type ProjectLogoProps = {
  rootPath: string;
  className?: string;
};

export function ProjectLogo({ rootPath, className }: ProjectLogoProps) {
  const version = useProjectLogoStore((s) => s.version);
  const { resolvedTheme } = useTheme();
  const [logos, setLogos] = useState<ProjectLogoPaths | null>(null);
  const [broken, setBroken] = useState(false);
  const logo = logos ? pickProjectLogo(logos, resolvedTheme) : null;

  useEffect(() => {
    let cancelled = false;
    setBroken(false);
    void findProjectLogo(rootPath).then((paths) => {
      if (!cancelled) setLogos(paths);
    });
    return () => {
      cancelled = true;
    };
  }, [rootPath, version]);

  if (!logo || broken) {
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
      onError={() => setBroken(true)}
      className={cn("size-4 shrink-0 rounded-sm object-contain", className)}
    />
  );
}
