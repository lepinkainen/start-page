// Classic Worker (UMD) + ORT 1.18 non-threaded
/* global self */

// 1) Load ORT UMD first so a global `ort` exists
importScripts("./vendor/onnx-1.18/ort.min.js");

// Point ORT to local non-threaded wasm blobs
self.ort.env.wasm.wasmPaths = "./vendor/onnx-1.18/";
self.ort.env.wasm.numThreads = 1; // single-thread avoids COOP/COEP

// 2) Load Transformers UMD from CDN (stable known-good)
importScripts(
  "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.15.1/dist/transformers.min.js"
);

const { pipeline, env } = self.transformers;
// Mirror the WASM settings into transformers' env (it proxies to ORT anyway)
env.backends.onnx.wasm.wasmPaths = "./vendor/onnx-1.18/";
env.backends.onnx.wasm.numThreads = 1;

const DEVICE = "wasm";

let clsPromise = null;
async function getClassifier() {
  if (!clsPromise) {
    clsPromise = pipeline(
      "zero-shot-classification",
      "Xenova/distilbert-base-uncased-mnli",
      {
        quantized: true,
        device: DEVICE,
      }
    );
  }
  return clsPromise;
}

self.onmessage = async (e) => {
  const msg = e.data || {};
  if (msg.type === "warmup") {
    try {
      await getClassifier();
      self.postMessage({ type: "ready" });
    } catch (err) {
      self.postMessage({ type: "error", message: String(err) });
    }
    return;
  }
  if (msg.type === "classify") {
    const { id, text, labels } = msg;
    try {
      const classify = await getClassifier();
      const t0 = (self.performance && performance.now()) || Date.now();
      const out = await classify(text, labels, {
        multi_label: false,
        hypothesis_template: "This text is about {}.",
      });
      const scores = Object.fromEntries(
        out.labels.map((l, i) => [l, out.scores[i]])
      );
      const runtime =
        ((self.performance && performance.now()) || Date.now()) - t0;
      self.postMessage({
        type: "result",
        id,
        label: out.labels[0],
        scores,
        runtimeMs: Math.round(runtime),
      });
    } catch (err) {
      self.postMessage({ type: "error", id, message: String(err) });
    }
  }
};

// Debug: make sure both globals exist
console.log("loaded ORT?", !!self.ort);
console.log("loaded transformers?", !!self.transformers);
