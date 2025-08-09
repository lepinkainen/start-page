#!/bin/bash

# get_deps.sh - Download dependencies for Smart Start
#
# This script downloads the required ML libraries and models for offline use.
# It also bundles the Web Worker JavaScript to handle import resolution.
#
# Usage: ./scripts/get_deps.sh [--help] [--force]
#
# Options:
#   --help     Show this help message
#   --force    Force re-download even if files exist
#
# What this script does:
# 1. Downloads transformers.js library for client-side ML
# 2. Downloads DistilBERT model files for zero-shot classification  
# 3. Bundles worker.js using esbuild for Web Worker compatibility
#
# When to run:
# - First time setup
# - After updating transformers.js version
# - If local model files are corrupted
# - When worker.js is modified

set -e

# Color output for better UX
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TRANSFORMERS_VERSION="2.17.2"
MODEL_NAME="Xenova/distilbert-base-uncased-finetuned-sst-2-english"
BASE_URL="https://huggingface.co/${MODEL_NAME}/resolve/main"
DEST_DIR="models/Xenova/distilbert-base-uncased-finetuned-sst-2-english"

# Parse command line arguments
FORCE_DOWNLOAD=false
SHOW_HELP=false

for arg in "$@"; do
    case $arg in
        --force)
            FORCE_DOWNLOAD=true
            shift
            ;;
        --help)
            SHOW_HELP=true
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $arg${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

if [ "$SHOW_HELP" = true ]; then
    head -n 20 "$0" | tail -n +3 | sed 's/^# //'
    exit 0
fi

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are available
check_dependencies() {
    log_info "Checking required tools..."
    
    if ! command -v curl &> /dev/null; then
        log_error "curl is required but not installed"
        exit 1
    fi
    
    if ! command -v npx &> /dev/null; then
        log_error "npx is required but not installed (install Node.js)"
        exit 1
    fi
    
    log_success "All required tools are available"
}

# Check if file exists and is not empty
file_exists_and_valid() {
    [ -f "$1" ] && [ -s "$1" ]
}

# Download transformers.js library
download_transformers() {
    log_info "Downloading transformers.js library..."
    
    local js_file="transformers.min.js"
    local map_file="transformers.min.js.map"
    
    if [ "$FORCE_DOWNLOAD" = false ] && file_exists_and_valid "$js_file" && file_exists_and_valid "$map_file"; then
        log_success "transformers.js files already exist, skipping download"
        return 0
    fi
    
    local base_url="https://cdn.jsdelivr.net/npm/@xenova/transformers@${TRANSFORMERS_VERSION}/dist"
    
    log_info "Downloading $js_file..."
    if curl -L --fail --progress-bar "$base_url/transformers.min.js" -o "$js_file"; then
        log_success "Downloaded $js_file"
    else
        log_error "Failed to download $js_file"
        exit 1
    fi
    
    log_info "Downloading $map_file..."
    if curl -L --fail --progress-bar "$base_url/transformers.min.js.map" -o "$map_file"; then
        log_success "Downloaded $map_file"
    else
        log_warning "Failed to download $map_file (non-critical)"
    fi
}

# Download ML model files
download_model() {
    log_info "Downloading ML model files for $MODEL_NAME..."
    
    # Create destination directory
    mkdir -p "$DEST_DIR/onnx"
    
    local files=(
        "config.json"
        "tokenizer.json" 
        "tokenizer_config.json"
        "onnx/model_quantized.onnx"
    )
    
    local all_exist=true
    if [ "$FORCE_DOWNLOAD" = false ]; then
        for file in "${files[@]}"; do
            if ! file_exists_and_valid "$DEST_DIR/$file"; then
                all_exist=false
                break
            fi
        done
        
        if [ "$all_exist" = true ]; then
            log_success "All model files already exist, skipping download"
            return 0
        fi
    fi
    
    for file in "${files[@]}"; do
        local dest_file="$DEST_DIR/$file"
        log_info "Downloading $file..."
        
        if curl -L --fail --progress-bar "$BASE_URL/$file" -o "$dest_file"; then
            log_success "Downloaded $file"
        else
            log_error "Failed to download $file"
            exit 1
        fi
    done
    
    log_success "Model download complete. Files saved to $DEST_DIR"
}

# Bundle worker JavaScript
bundle_worker() {
    log_info "Building worker bundle..."
    
    if [ "$FORCE_DOWNLOAD" = false ] && file_exists_and_valid "worker.bundle.js" && [ "worker.js" -ot "worker.bundle.js" ]; then
        log_success "Worker bundle is up to date, skipping build"
        return 0
    fi
    
    if [ ! -f "worker.js" ]; then
        log_warning "worker.js not found, skipping bundle step"
        return 0
    fi
    
    log_info "Running esbuild..."
    if npx esbuild worker.js --bundle --format=esm --outfile=worker.bundle.js --platform=browser --sourcemap; then
        log_success "Worker bundle created: worker.bundle.js"
    else
        log_error "Failed to build worker bundle"
        exit 1
    fi
}

# Display summary
show_summary() {
    log_info "Dependency setup complete!"
    echo
    echo "Downloaded files:"
    [ -f "transformers.min.js" ] && echo "  ✓ transformers.min.js"
    [ -f "transformers.min.js.map" ] && echo "  ✓ transformers.min.js.map"
    [ -d "$DEST_DIR" ] && echo "  ✓ ML model files in $DEST_DIR/"
    [ -f "worker.bundle.js" ] && echo "  ✓ worker.bundle.js"
    echo
    echo "Your Smart Start application is ready for offline ML!"
    echo "Run 'deno task dev' to start the development server."
}

# Main execution
main() {
    log_info "Smart Start Dependency Setup"
    echo "=============================="
    
    check_dependencies
    download_transformers
    download_model
    bundle_worker
    show_summary
}

# Run main function
main "$@"