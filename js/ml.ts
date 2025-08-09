import type { MLPipeline, TransformersModule } from "./types.ts";

export const LABELS = ["movie", "tv show", "video game", "general"] as const;

let mlPipeline: MLPipeline | null = null;
let mlInitAttempted = false;

export async function initMLPipeline(): Promise<MLPipeline | null> {
  if (mlPipeline) return mlPipeline;
  if (mlInitAttempted) return null; // Don't retry on every keystroke

  mlInitAttempted = true;
  try {
    console.log("Loading transformers.js...");
    const mlStatusEl = document.getElementById("ml");
    if (mlStatusEl) mlStatusEl.textContent = "ML loading...";

    const module: TransformersModule = await import(
      "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2?v=5"
    );

    module.env.allowLocalModels = false;

    mlPipeline = await module.pipeline(
      "zero-shot-classification",
      "Xenova/distilbert-base-uncased-mnli",
      {
        progress_callback: (progress: any) => {
          const statusEl = document.getElementById("ml");
          if (!statusEl) return;

          if (progress.status === "downloading") {
            statusEl.textContent = `ML downloading: ${Math.round(
              progress.progress || 0
            )}%`;
          } else if (progress.status === "ready") {
            statusEl.textContent = "ML ready";
          }
        },
      }
    );

    const statusEl = document.getElementById("ml");
    if (statusEl) statusEl.textContent = "ML ready";
    console.log("ML pipeline initialized");
    return mlPipeline;
  } catch (error) {
    console.warn("ML initialization failed:", error);
    const statusEl = document.getElementById("ml");
    if (statusEl) statusEl.textContent = "ML unavailable";
    return null;
  }
}