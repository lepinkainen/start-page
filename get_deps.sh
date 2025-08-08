#!/bin/bash

set -e

curl -L https://cdn.jsdelivr.net/npm/@xenova/transformers/dist/transformers.min.js -o transformers.min.js
curl -L https://cdn.jsdelivr.net/npm/@xenova/transformers/dist/transformers.min.js.map -o transformers.min.js.map

MODEL_NAME="Xenova/distilbert-base-uncased-finetuned-sst-2-english"
BASE_URL="https://huggingface.co/${MODEL_NAME}/resolve/main"

DEST_DIR="models/Xenova/distilbert-base-uncased-finetuned-sst-2-english"

mkdir -p "$DEST_DIR/onnx"

echo "Downloading model files for $MODEL_NAME..."

curl -L "$BASE_URL/config.json" -o "$DEST_DIR/config.json"
curl -L "$BASE_URL/tokenizer.json" -o "$DEST_DIR/tokenizer.json"
curl -L "$BASE_URL/tokenizer_config.json" -o "$DEST_DIR/tokenizer_config.json"
curl -L "$BASE_URL/onnx/model_quantized.onnx" -o "$DEST_DIR/onnx/model_quantized.onnx"

echo "Download complete. Files saved to $DEST_DIR"
