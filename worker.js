import { pipeline } from "@xenova/transformers";

// Cache the pipeline
let classificationPipeline = null;

self.onmessage = async (event) => {
  const { type, text, labels } = event.data;
  
  try {
    // Handle initialization request
    if (type === "init") {
      if (!classificationPipeline) {
        // Send progress updates
        self.postMessage({
          type: "progress",
          status: "initializing",
          message: "Loading ML model..."
        });
        
        classificationPipeline = await pipeline(
          "zero-shot-classification",
          "Xenova/distilbert-base-uncased-mnli",
          {
            progress_callback: (progress) => {
              self.postMessage({
                type: "progress",
                status: progress.status,
                progress: progress.progress || 0,
                message: progress.status === "downloading" 
                  ? `Downloading model: ${Math.round(progress.progress || 0)}%`
                  : progress.status === "ready" 
                    ? "Model ready" 
                    : "Loading model..."
              });
            }
          }
        );
        
        self.postMessage({
          type: "ready",
          message: "ML pipeline initialized"
        });
      } else {
        // Already initialized
        self.postMessage({
          type: "ready",
          message: "ML pipeline already initialized"
        });
      }
      return;
    }
    
    // Handle classification request
    if (type === "classify") {
      // Initialize if not already done
      if (!classificationPipeline) {
        self.postMessage({
          type: "error",
          error: "Pipeline not initialized. Send init message first."
        });
        return;
      }
      
      // Validate inputs
      if (!text || !labels || labels.length === 0) {
        self.postMessage({
          type: "error",
          error: "Invalid input: text and labels array required"
        });
        return;
      }
      
      // Perform classification
      const startTime = performance.now();
      const result = await classificationPipeline(text, labels);
      const endTime = performance.now();
      
      // Send result in the expected format
      self.postMessage({
        type: "result",
        labels: result.labels,
        scores: result.scores,
        runtime: Math.round(endTime - startTime)
      });
    }
    
  } catch (error) {
    self.postMessage({
      type: "error",
      error: error.message || "Operation failed"
    });
  }
};