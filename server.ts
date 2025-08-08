// deno run -A server.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

Deno.env.set("TRANSFORMERS_DISABLE_SHARP", "1");  // <-- add this line

// ✅ use npm specifiers so Deno resolves proper entry points
import { pipeline, env } from "npm:@xenova/transformers@2.15.1";

// Use WASM backend; point to a known-good ORT Web with non-threaded wasm
env.backends.onnx.wasm.wasmPaths =
  "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/";
env.backends.onnx.wasm.numThreads = 1; // avoid COOP/COEP/threaded quirks
env.allowRemoteModels = true;

const DEVICE = "wasm";
const classify = await pipeline(
  "zero-shot-classification",
  "Xenova/distilbert-base-uncased-mnli",
  { quantized: true, device: DEVICE },
);

const labels = ["movie", "tv show", "video game", "programming", "general"];

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // Serve static files (index.html etc.) from CWD
  if (req.method === "GET" && (url.pathname === "/" || !url.pathname.startsWith("/classify"))) {
    try {
      const path = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
      const data = await Deno.readFile(path);
      const ct = path.endsWith(".css") ? "text/css"
        : path.endsWith(".js") ? "text/javascript"
        : path.endsWith(".ico") ? "image/x-icon"
        : "text/html";
      return new Response(data, { headers: { "content-type": ct } });
    } catch {
      // fallthrough
    }
  }

  if (req.method === "POST" && url.pathname === "/classify") {
    try {
      const { text } = await req.json();
      const s = String(text ?? "").slice(0, 2000);
      if (!s) return new Response(JSON.stringify({ error: "missing text" }), { status: 400 });
      const t0 = Date.now();
      const out = await classify(s, labels, { multi_label: false, hypothesis_template: "This text is about {}." });
      const scores: Record<string, number> = {};
      out.labels.forEach((l: string, i: number) => scores[l] = out.scores[i]);
      return new Response(JSON.stringify({ label: out.labels[0], scores, ms: Date.now() - t0 }), {
        headers: { "content-type": "application/json" },
      });
    } catch (e) {
      console.error(e);
      return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
    }
  }

  return new Response("Not found", { status: 404 });
}

console.log("Smart Start (Deno) at http://127.0.0.1:8080");
serve(handler, { hostname: "127.0.0.1", port: 8080 });