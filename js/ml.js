export const LABELS = ["movie", "tv show", "video game", "general"];

let mlPipeline = null;
let mlInitAttempted = false;

export async function initMLPipeline() {
  if (mlPipeline) return mlPipeline;
  if (mlInitAttempted) return null; // Don't retry on every keystroke

  mlInitAttempted = true;
  try {
    console.log("Loading transformers.js...");
    const mlStatusEl = document.getElementById("ml");
    mlStatusEl.textContent = "ML loading...";

    const { pipeline, env } = await import(
      "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2?v=5"
    );

    env.allowLocalModels = false;

    mlPipeline = await pipeline(
      "zero-shot-classification",
      "Xenova/distilbert-base-uncased-mnli",
      {
        progress_callback: (progress) => {
          if (progress.status === "downloading") {
            mlStatusEl.textContent = `ML downloading: ${Math.round(
              progress.progress || 0
            )}%`;
          } else if (progress.status === "ready") {
            mlStatusEl.textContent = "ML ready";
          }
        },
      }
    );

    mlStatusEl.textContent = "ML ready";
    console.log("ML pipeline initialized");
    return mlPipeline;
  } catch (error) {
    console.warn("ML initialization failed:", error);
    const mlStatusEl = document.getElementById("ml");
    mlStatusEl.textContent = "ML unavailable";
    return null;
  }
}
