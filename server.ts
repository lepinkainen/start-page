// deno run -A server.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// Simple static file server - ML now handled client-side

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // Serve static files (index.html etc.) from CWD
  if (req.method === "GET") {
    try {
      const path = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
      const data = await Deno.readFile(path);
      const ct = path.endsWith(".css") ? "text/css"
        : path.endsWith(".js") ? "text/javascript"
        : path.endsWith(".ico") ? "image/x-icon"
        : "text/html";
      return new Response(data, { headers: { "content-type": ct } });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  }

  return new Response("Not found", { status: 404 });
}

console.log("Smart Start (Deno) at http://0.0.0.0:8080");
serve(handler, { hostname: "0.0.0.0", port: 8080 });