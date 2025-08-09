let mlWorker = null;
let workerReady = false;
let initPromise = null;

export function initWorker() {
  if (initPromise) return initPromise;
  
  initPromise = new Promise((resolve, reject) => {
    try {
      mlWorker = new Worker("./worker.bundle.js", { type: "module" });
      
      // Set up message handler for initialization
      const initHandler = (e) => {
        if (e.data.type === "ready") {
          workerReady = true;
          console.log("ML Worker initialized and ready");
          mlWorker.removeEventListener("message", initHandler);
          resolve(mlWorker);
        } else if (e.data.type === "progress") {
          // Update UI with progress
          const mlEl = document.getElementById("ml");
          if (mlEl) {
            mlEl.textContent = e.data.message || "ML loading...";
          }
        } else if (e.data.type === "error") {
          console.error("Worker initialization error:", e.data.error);
          mlWorker.removeEventListener("message", initHandler);
          reject(new Error(e.data.error));
        }
      };
      
      mlWorker.addEventListener("message", initHandler);
      
      // Send proper initialization message
      mlWorker.postMessage({ type: "init" });
      
    } catch (error) {
      console.error("Failed to create ML worker:", error);
      reject(error);
    }
  });
  
  return initPromise;
}

export async function classifyWithWorker(text, labels) {
  try {
    await initWorker();
    
    if (!mlWorker || !workerReady) {
      throw new Error("Worker not ready");
    }
    
    return new Promise((resolve, reject) => {
      const messageHandler = (e) => {
        if (e.data.type === "result") {
          mlWorker.removeEventListener("message", messageHandler);
          resolve({
            labels: e.data.labels,
            scores: e.data.scores,
            runtime: e.data.runtime
          });
        } else if (e.data.type === "error") {
          mlWorker.removeEventListener("message", messageHandler);
          reject(new Error(e.data.error));
        }
        // Ignore progress messages during classification
      };
      
      mlWorker.addEventListener("message", messageHandler);
      mlWorker.postMessage({ type: "classify", text, labels });
      
      // Add timeout
      setTimeout(() => {
        mlWorker.removeEventListener("message", messageHandler);
        reject(new Error("Classification timeout"));
      }, 30000); // 30 second timeout
    });
  } catch (error) {
    console.error("Classification error:", error);
    throw error;
  }
}

export function isWorkerReady() {
  return workerReady;
}