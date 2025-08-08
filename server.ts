// deno run -A server.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname === "/" ? "index.html" : url.pathname.slice(1);

  try {
    const data = await Deno.readFile(path);
    const ext = path.split(".").pop()?.toLowerCase();
    const ct =
      ext === "css"
        ? "text/css"
        : ext === "js"
        ? "text/javascript"
        : ext === "json"
        ? "application/json"
        : ext === "onnx"
        ? "application/octet-stream"
        : ext === "ico"
        ? "image/x-icon"
        : "text/html";
    return new Response(data, { headers: { "content-type": ct } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

console.log("Serving on http://localhost:8080");
serve(handler, { hostname: "0.0.0.0", port: 8080 });
