// Ambient type definitions for Supabase Deno Edge Functions in VS Code / Antigravity IDE

declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    toObject(): Record<string, string>;
  }
  export const env: Env;
  export function serve(handler: (req: Request) => Promise<Response> | Response): void;
}

declare module 'https://*' {
  const content: any;
  export default content;
  export const serve: any;
  export const createClient: any;
}

declare module 'http://*' {
  const content: any;
  export default content;
}
