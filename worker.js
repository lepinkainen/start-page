import { pipeline } from "@xenova/transformers";

self.onmessage = async (event) => {
  const text = event.data;

  // Create the pipeline once and cache it
  if (!self._pipe) {
    self._pipe = await pipeline(
      "sentiment-analysis",
      "Xenova/distilbert-base-uncased-finetuned-sst-2-english"
    );
  }

  const result = await self._pipe(text);
  self.postMessage(result);
};
