import type { MLPipeline, ClassificationResult } from "./types.ts";
import { LABELS } from "./categories.ts";

// Re-export for backward compatibility
export { LABELS } from "./categories.ts";

// Import the worker client (will be transpiled by server)
// @ts-ignore - worker-client.js is a JavaScript file
import { initWorker, classifyWithWorker, isWorkerReady } from "./worker-client.js";

let mlInitialized = false;
let mlInitAttempted = false;
let mlPipeline: MLPipeline | null = null;

export async function initMLPipeline(): Promise<MLPipeline | null> {
  if (mlPipeline && mlInitialized) return mlPipeline;
  if (mlInitAttempted) return null; // Don't retry on every keystroke

  mlInitAttempted = true;
  
  try {
    console.log("Initializing ML Worker...");
    const mlStatusEl = document.getElementById("ml");
    if (mlStatusEl) mlStatusEl.textContent = "ML loading...";

    // Initialize the worker
    await initWorker();
    
    // Create a function that matches the MLPipeline interface
    mlPipeline = async (text: string, labels: string[]): Promise<ClassificationResult> => {
      const result = await classifyWithWorker(text, labels);
      return {
        labels: result.labels,
        scores: result.scores
      };
    };
    
    mlInitialized = true;
    
    const statusEl = document.getElementById("ml");
    if (statusEl) statusEl.textContent = "ML ready";
    console.log("ML Worker pipeline initialized");
    
    return mlPipeline;
    
  } catch (error) {
    console.warn("ML Worker initialization failed:", error);
    const statusEl = document.getElementById("ml");
    if (statusEl) statusEl.textContent = "ML unavailable";
    return null;
  }
}

// Export a function to check if ML is ready
export function isMLReady(): boolean {
  return mlInitialized && isWorkerReady();
}