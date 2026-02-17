declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(handler: (req: Request) => Promise<Response> | Response): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
  export const createClient: (url: string, key: string, options?: unknown) => unknown;
  export type SupabaseClient = unknown;
}

declare const Deno: {
  env: { get(name: string): string | undefined };
};
