import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { bundle } from "https://deno.land/x/emit@0.32.0/mod.ts";

interface CacheEntry {
  content: string;
  mtime: number;
}

const cache = new Map<string, CacheEntry>();

async function getFileModTime(path: string): Promise<number | null> {
  try {
    const stat = await Deno.stat(path);
    return stat.mtime?.getTime() || 0;
  } catch {
    return null;
  }
}

async function transpileTypeScript(filePath: string): Promise<string | null> {
  try {
    // Check cache first
    const currentMtime = await getFileModTime(filePath);
    if (!currentMtime) return null;

    const cached = cache.get(filePath);
    if (cached && cached.mtime >= currentMtime) {
      return cached.content;
    }

    // Use Deno's official emit library for proper transpilation
    const url = new URL(filePath, `file://${Deno.cwd()}/`).href;
    const result = await bundle(url);
    
    if (!result.code) return null;

    // Cache the result
    cache.set(filePath, { content: result.code, mtime: currentMtime });

    return result.code;
  } catch (error) {
    console.error(`Failed to transpile ${filePath}:`, error);
    return null;
  }
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const requestPath = url.pathname === "/" ? "index.html" : url.pathname.slice(1);

  try {
    // Handle TypeScript files
    if (requestPath.endsWith(".ts")) {
      const tsContent = await transpileTypeScript(requestPath);
      if (tsContent) {
        return new Response(tsContent, {
          headers: { "content-type": "text/javascript" },
        });
      }
    }

    // Check if JavaScript file exists as TypeScript
    if (requestPath.endsWith(".js")) {
      const tsPath = requestPath.replace(".js", ".ts");
      const tsExists = await getFileModTime(tsPath);
      if (tsExists) {
        const tsContent = await transpileTypeScript(tsPath);
        if (tsContent) {
          return new Response(tsContent, {
            headers: { "content-type": "text/javascript" },
          });
        }
      }
    }

    // Fall back to regular static file serving
    const data = await Deno.readFile(requestPath);
    const ext = requestPath.split(".").pop()?.toLowerCase();
    const contentType =
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

    return new Response(data, { headers: { "content-type": contentType } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

console.log("Serving on http://localhost:8080 (with TypeScript transpilation)");
serve(handler, { hostname: "0.0.0.0", port: 8080 });