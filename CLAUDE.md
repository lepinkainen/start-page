# Smart Start - AI-Powered Search Launcher

A Deno-based web application that intelligently routes search queries to appropriate providers (IMDb, Letterboxd, OpenCritic, etc.) using **CLIENT-SIDE ML classification**.

## Architecture Overview

**Purpose**: Perform ML inference in the browser using main thread ML with robust heuristic fallback
**Frontend**: Single-page application (`index.html`) with vanilla JavaScript
**Backend**: Deno server (`server.ts`) serving static files only (no ML processing)
**ML Pipeline**: Main thread transformers.js with DistilBERT zero-shot classification  
**Runtime**: Deno with automatic npm package resolution

## Key Components

### Core Files

- `index.html`: Complete SPA with embedded JS, handles UI and ML classification
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
├── index.html          # Main SPA with embedded JavaScript + ML
├── server.ts           # Deno static file server (no ML endpoints)
├── style.css           # CSS with theme variables
├── deno.json           # Deno tasks: dev (watch), start
├── compose.yml         # Docker Compose configuration
├── llm-shared/         # Shared development guidelines (git submodule)
└── node_modules/       # Auto-managed Deno npm cache
```

## Key Implementation Details

### ML Integration (WORKING)

- **Main thread approach**: No Web Workers, ML runs in main thread
- **Library loading**: CDN import via `await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2?v=5')`
- **Error handling**: Single attempt with `mlInitAttempted` flag prevents console spam
- **UI feedback**: Shows "ML loading...", "ML ready", or "ML unavailable"
- **Message flow**: Direct function calls, no worker message passing

### Provider Configuration

Providers defined in `PROVIDERS` array in `index.html`:

```javascript
{
  id: "imdb",
  name: "IMDb",
  url: "https://www.imdb.com/find/?q={q}",
  types: ["movie", "tv"],
  aliases: ["!imdb", "!i"]
}
```

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

- **Add new provider**: Modify `PROVIDERS` array in `index.html`
- **Adjust ML labels**: Update `LABELS`/`LABEL_TO_PROVIDER` mappings
- **Modify heuristics**: Edit `classifyQuery()` function for pattern matching
- **Update styles**: Modify CSS custom properties in `:root` selectors
- **Debug ML**: Check browser console for CDN loading issues

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
