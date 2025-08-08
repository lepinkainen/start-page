let mlWorker = null;

export function initWorker() {
  if (mlWorker) return mlWorker;
  try {
    mlWorker = new Worker("../worker.bundle.js");
    console.log("ML Worker started");
  } catch (e) {
    console.warn("Failed to start ML worker:", e);
    mlWorker = null;
  }
  return mlWorker;
}

export function classifyWithWorker(text) {
  return new Promise((resolve, reject) => {
    const worker = initWorker();
    if (!worker) return reject("Worker not available");
    const handleMessage = (e) => {
      resolve(e.data);
      worker.removeEventListener("message", handleMessage);
    };
    worker.addEventListener("message", handleMessage);
    worker.postMessage(text);
  });
}
