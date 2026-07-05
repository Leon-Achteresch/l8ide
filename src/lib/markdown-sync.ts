export interface MarkdownBridge {
  setReady(currentCrepeMarkdown: string): void;
  isReady(): boolean;
  fromCrepe(markdown: string, write: (md: string) => void): void;
  fromModel(md: string, apply: (md: string) => string): void;
}

export function createMarkdownBridge(initial: string): MarkdownBridge {
  let synced = initial;
  let ready = false;
  let writingToModel = false;
  let applyingToCrepe = false;

  return {
    setReady(currentCrepeMarkdown) {
      synced = currentCrepeMarkdown;
      ready = true;
    },
    isReady: () => ready,
    fromCrepe(markdown, write) {
      if (!ready || applyingToCrepe || markdown === synced) return;
      synced = markdown;
      writingToModel = true;
      write(markdown);
      writingToModel = false;
    },
    fromModel(md, apply) {
      if (!ready || writingToModel || md === synced) return;
      applyingToCrepe = true;
      synced = apply(md);
      applyingToCrepe = false;
    },
  };
}
