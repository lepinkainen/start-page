# Smart Start - AI-Powered Search Launcher

A Deno-based web application that intelligently routes search queries to appropriate providers (IMDb, Letterboxd, OpenCritic, etc.) using **CLIENT-SIDE ML classification**.

## Architecture Overview

**Purpose**: Perform ML inference in the browser using main thread ML with robust heuristic fallback
**Frontend**: Single-page application (`index.html`) with modular vanilla JavaScript 
**Backend**: Deno server (`server.ts`) serving static files only (no ML processing)
**ML Pipeline**: Main thread transformers.js with DistilBERT zero-shot classification  
**Runtime**: Deno with automatic npm package resolution

## Key Components

### Core Files

- `index.html`: Main SPA entry point, loads modular JavaScript
- `js/app.js`: Main application logic, UI event handling, provider routing
- `js/constants.js`: Provider definitions, settings, ML label mappings
- `js/ml.js`: ML pipeline initialization and transformers.js integration
- `js/utils.js`: Utility functions (DOM helpers, query encoding)
- `js/worker-client.js`: Web Worker client (legacy, not currently used)
- `server.ts`: Deno HTTP server serving static files (no ML endpoints)
- `style.css`: CSS variables with light/dark mode support

### ML Classification System

- **Client-side main thread**: Browser does ALL ML work using transformers.js@2.17.2
- **Model**: `Xenova/distilbert-base-uncased-mnli` for zero-shot classification
- **Labels**: `["movie", "tv show", "video game", "general"]`
- **Fallback**: Robust heuristic classification for when ML unavailable
- **Performance**: ~100ms inference time, single attempt per query

### Provider Routing Logic

1. **Alias detection**: `!imdb The Matrix` → direct provider routing
2. **ML classification**: Main thread inference with loading states
3. **Heuristic fallback**: TV cues (`S01E02`), years (`2019`), game keywords
4. **Default provider**: Configurable fallback (localStorage)

## Development Workflow

### Running the Application

```bash
# Local development (with auto-restart on file changes)
deno task dev
# Serves at http://127.0.0.1:8080

# Production
deno task start
# or directly: deno run -A server.ts
```

### Project Structure

```text
/
├── index.html          # Main SPA entry point
├── js/                 # Modular JavaScript components
│   ├── app.js          # Main application logic
│   ├── constants.js    # Providers, settings, mappings
│   ├── ml.js           # ML pipeline integration
│   ├── utils.js        # Utility functions
│   └── worker-client.js # Web Worker client (legacy)
├── server.ts           # Deno static file server
├── style.css           # CSS with theme variables
├── deno.json           # Deno tasks: dev (watch), start
├── compose.yml         # Docker Compose configuration
├── llm-shared/         # Shared development guidelines (git submodule)
├── models/             # Local ML model cache (optional)
└── node_modules/       # Auto-managed Deno npm cache
```

## Key Implementation Details

### ML Integration (WORKING)

- **Main thread approach**: No Web Workers, ML runs in main thread with ~100ms blocking
- **Library loading**: CDN import via `await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2?v=5')`
- **Model**: `Xenova/distilbert-base-uncased-mnli` for zero-shot classification
- **Pipeline init**: `js/ml.js` handles initialization with progress callbacks and error states
- **Classification flow**: `startClassification()` in `js/app.js` → `initMLPipeline()` → main thread inference
- **Confidence scoring**: Only trusts ML if top score ≥60% and margin ≥15% from second choice
- **Error handling**: Single attempt with `mlInitAttempted` flag prevents console spam
- **UI feedback**: Real-time status in `#ml` element ("ML loading...", "ML ready", "ML unavailable")

### Provider Configuration

Providers defined in `PROVIDERS` array in `js/constants.js`:

```javascript
{
  id: "imdb",
  name: "IMDb",
  url: "https://www.imdb.com/find/?q={q}",
  types: ["movie", "tv"],
  aliases: ["!imdb", "!i"]
}
```

**Key Configuration Objects** (all in `js/constants.js`):
- `PROVIDERS`: Array of search providers with URLs, types, and aliases
- `SETTINGS`: Local storage configuration (openInNewTab, pinned providers, etc.)
- `LABELS`: ML classification labels `["movie", "tv show", "video game", "general"]` 
- `LABEL_TO_PROVIDER`: Maps ML predictions to default providers
- `LABEL_TO_TYPE`: Maps ML labels to provider type filtering

### State Management

- localStorage: `pinnedProviders`, `defaultProvider`, `openInNewTab`, `region`
- No external state management - vanilla JS with DOM updates
- ML state: `MODEL.ready`, `MODEL.suggest`, `MODEL.scores`

## Technical Notes

### Deno Specifics

- Uses `deno.json` for task definitions and `nodeModulesDir: "auto"`
- **No npm dependencies**: Everything loaded via CDN in browser
- **Watch mode**: `deno task dev` auto-restarts server on file changes
- No build step required - serves static files directly

### ML Architecture Benefits

- **Simplified implementation**: Direct function calls without worker message passing
- **Reliable CDN loading**: Dynamic imports work consistently in main thread
- **Performance**: Minor UI freeze (~100ms) acceptable for search use case
- **Reliability**: Graceful degradation when CDN unavailable

### Browser Compatibility

- **Vanilla JS**: No frameworks, works in all modern browsers
- **Dynamic imports**: Requires modern browser support for `import()`
- **CSS custom properties**: For theming and responsive design
- **Progressive enhancement**: Heuristics work when ML fails

## Common Development Tasks

- **Add new provider**: Modify `PROVIDERS` array in `js/constants.js`
- **Adjust ML labels**: Update `LABELS`/`LABEL_TO_PROVIDER` mappings in `js/constants.js`
- **Modify heuristics**: Edit `classifyQuery()` function in `js/app.js` for pattern matching
- **Update styles**: Modify CSS custom properties in `:root` selectors in `style.css`
- **Debug ML**: Check browser console for CDN loading issues, monitor `js/ml.js` status
- **Test providers**: Use keyboard shortcuts (Alt+0-9) or click chips to test routing

## Current Status

### Working Features ✅

- **ML classification**: Main thread transformers.js working reliably
- **Heuristic fallback**: Robust pattern matching for all query types
- **Provider routing**: All keyboard shortcuts and UI interactions
- **Static serving**: Deno server serves files correctly
- **Error handling**: Clean ML failure states with user feedback

### Architecture Decisions

- **No Service Worker**: Removed to eliminate cache-related ML loading issues
- **Main thread ML**: Simpler than Web Workers, reliable CDN loading
- **Client-side only**: Server does zero ML processing, just serves static files
- **Vanilla JS**: No frameworks keeps bundle small and loading fast

### Development Guidelines

- **Test ML thoroughly**: Clear browser cache if CDN URLs change
- **Focus on client-side**: Don't add server-side ML endpoints  
- **Maintain fallbacks**: Heuristics should handle 95% of queries effectively
- **Cache busting**: Use URL parameters (`?v=X`) when changing CDN imports
- **Follow llm-shared conventions**: This project uses the shared development guidelines in `llm-shared/`
- **No build system needed**: Project runs directly with `deno task dev` - no compilation step
- **Branch workflow**: Never commit directly to main - use feature branches and PRs
- **Module structure**: Keep JavaScript modular in `js/` directory, avoid large monolithic files
