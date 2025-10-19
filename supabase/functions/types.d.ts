declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(
    handler: (request: Request) => Response | Promise<Response>,
    options?: { port?: number }
  ): void;
}

declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
};

