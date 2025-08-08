# Smart Start - AI-Powered Search Launcher

A Deno-based web application that intelligently routes search queries to appropriate providers (IMDb, Letterboxd, OpenCritic, etc.) using **CLIENT-SIDE ML classification**.

## Architecture Overview

**Purpose**: Perform ML inference in the browser so the server doesn't have to do any ML work
**Frontend**: Single-page application (`index.html`) with vanilla JavaScript
**Backend**: Deno server (`server.ts`) serving static files only (no ML processing)
**ML Pipeline**: Client-side Web Worker using Transformers.js with DistilBERT
**Runtime**: Deno with automatic npm package resolution

## Key Components

### Core Files

- `index.html`: Complete SPA with embedded JS, handles UI and query classification
- `server.ts`: Deno HTTP server serving static files (no ML endpoints)
- `worker.js`: ES Module Web Worker for client-side ML classification
- `style.css`: CSS variables with light/dark mode support

### ML Classification System

- **Client-side only**: Browser does ALL ML work, server does ZERO ML processing
- **Current status**: BROKEN - remote JavaScript library loading is unreliable
- **Error**: `NetworkError: Failed to execute 'importScripts'` from CDN dependencies
- **Model**: `Xenova/distilbert-base-uncased-mnli` for zero-shot classification (when working)
- **Labels**: `["movie", "tv show", "video game", "general"]`
- **Fallback**: Robust heuristic classification (currently the only working method)

### Provider Routing Logic

1. **Alias detection**: `!imdb The Matrix` → direct provider routing
2. **ML classification**: ES Module Worker with message passing
3. **Heuristic fallback**: TV cues (`S01E02`), years (`2019`), game keywords  
4. **Default provider**: Configurable fallback (localStorage)

## Development Workflow

### Running the Application

```bash
# Local development (with auto-restart on file changes)
deno task dev
# Serves at http://127.0.0.1:8080

# Production (when ML is working)
deno task start
# or directly: deno run -A server.ts

# Docker Compose - DON'T USE until local development works
# docker compose up
```

### Project Structure

```text
/
├── index.html          # Main SPA with embedded JavaScript
├── server.ts           # Deno static file server (no ML endpoints)
├── worker.js           # ES Module Worker for client-side ML
├── style.css           # CSS with theme variables
├── deno.json           # Deno tasks: dev (watch), start
├── compose.yml         # Docker Compose configuration
├── sw.js               # Service worker (unused in current version)
├── llm-shared/         # Shared development guidelines (git submodule)
└── node_modules/       # Auto-managed Deno npm cache
```

## Key Patterns

### Provider Configuration

Providers are defined in `PROVIDERS` array in `index.html`:

```javascript
{
  id: "imdb",
  name: "IMDb",
  url: "https://www.imdb.com/find/?q={q}",
  types: ["movie", "tv"],
  aliases: ["!imdb", "!i"]
}
```

### ML Integration (CURRENTLY BROKEN)

- **Goal**: ES Module Worker with `new Worker("./worker.js", { type: "module" })`
- **Problem**: Remote JavaScript libraries fail to load in workers
- **Current error**: `worker.js:12 Uncaught NetworkError: Failed to execute 'importScripts'`
- **Message protocol**: `{ type: "classify", text, labels }` → `{ type: "result", label, scores, runtimeMs }` (when working)
- **Fallback**: Heuristic classification in `classifyQuery()` function works fine

### State Management

- Uses localStorage for: `pinnedProviders`, `defaultProvider`, `openInNewTab`, `region`
- No external state management - vanilla JS with DOM updates

### Keyboard Shortcuts

- `Enter`: Open recommended provider
- `Ctrl/⌘+Enter`: Open all pinned providers
- `Shift+Enter`: Open all selected providers for current query type
- `Alt+0-9`: Quick access to provider by index

## Technical Notes

### Deno Specifics

- Uses `deno.json` for task definitions and `nodeModulesDir: "auto"`
- **No npm dependencies**: Everything loaded via CDN in browser
- **Watch mode**: `deno task dev` auto-restarts server on file changes
- No build step required - serves static files directly

### ML Configuration (THE PROBLEM)

- **JavaScript dependency hell**: Remote CDN libraries fail to load consistently
- **ImportScripts failures**: `NetworkError` when trying to load transformers from CDN
- **ES Module issues**: Modern worker approach still broken due to library compatibility
- **Current workaround**: Heuristic classification works and is actually quite good

### Browser Compatibility

- **Vanilla JS**: No frameworks, works in all modern browsers
- **ES Module Workers**: Requires modern browser support for `{ type: "module" }`
- **CSS custom properties**: For theming and responsive design
- **Progressive enhancement**: Heuristics work even when ML fails

## Deployment & Development

### Docker Setup
- `compose.yml` uses official Deno Alpine image
- Environment variable `TRANSFORMERS_DISABLE_SHARP=1` set for ML compatibility
- Volume mounts current directory for development
- Exposes port 8080

### Development Guidelines
- **No build process**: Deno serves files directly, no compilation needed
- **Dependencies**: Auto-resolved via npm specifiers in imports
- **Testing**: No formal test framework - validate functionality manually in browser
- **Linting**: Follow JavaScript guidelines in `llm-shared/languages/javascript.md`

## Common Tasks

- **Add new provider**: Modify `PROVIDERS` array in `index.html`
- **Adjust ML labels**: Update `LABELS`/`LABEL_TO_PROVIDER` in `index.html` and worker message protocol
- **Modify classification logic**: Edit `classifyQuery()` function in `index.html` for heuristics
- **Change styling**: Update CSS custom properties in `:root` selectors in `style.css`
- **Debug ML issues**: Check browser console for ES module worker errors and CDN loading issues

## Current Issues

### CLIENT-SIDE ML IS BROKEN
- **Root cause**: JavaScript ecosystem sucks at loading remote dependencies in workers
- **Specific error**: `worker.js:12 Uncaught NetworkError: Failed to execute 'importScripts'`  
- **CDN attempts tried**: jsDelivr, unpkg, Skypack - all fail intermittently
- **ES Module attempts**: `{ type: "module" }` workers still fail due to library issues
- **Priority**: Fix local development first, ignore Docker until this works

### Working Features
- **Heuristic classification**: Actually works well for most queries
- **Provider routing**: All keyboard shortcuts and UI interactions work
- **Static serving**: Deno server works fine
- **Fallback behavior**: App functions completely without ML

### Next Steps for AI Assistants
1. **Focus on local development only** - don't mess with Docker
2. **Fix the JavaScript dependency loading** - this is the core problem  
3. **The server is fine** - don't add ML endpoints, keep it client-side
4. **Test thoroughly** - restart `deno task dev` and use fresh browser tabs
