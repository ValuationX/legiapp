declare module 'mapshaper' {
  export function runCommands(commands: string): Promise<void>;
  export function applyCommands(
    commands: string,
    input?: Record<string, unknown>,
  ): Promise<Record<string, string>>;
}
