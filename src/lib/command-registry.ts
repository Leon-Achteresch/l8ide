let registry: Record<string, () => void> = {};

export function setCommandRegistry(handlers: Record<string, () => void>) {
  registry = handlers;
}

export function runCommand(id: string) {
  registry[id]?.();
}
