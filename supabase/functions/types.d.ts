declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(
    handler: (req: Request) => Response | Promise<Response>,
  ): void | Promise<void>;
}

type SupabaseClient = {
  from(table: string): any;
  auth: {
    getUser(accessToken: string): Promise<{
      data: {
        user: {
          id: string;
          user_metadata?: Record<string, unknown>;
          app_metadata?: Record<string, unknown>;
        } | null;
      };
    }>;
  };
};

declare module "https://esm.sh/@supabase/supabase-js@2" {
  export function createClient(
    url: string,
    key: string,
  ): SupabaseClient;
}
