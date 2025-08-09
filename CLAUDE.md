# Smart Start - AI-Powered Search Launcher

A Deno-based web application that intelligently routes search queries to appropriate providers (IMDb, Letterboxd, OpenCritic, etc.) using **CLIENT-SIDE ML classification**.

## Architecture Overview

**Purpose**: Perform ML inference in the browser using main thread ML with robust heuristic fallback
**Frontend**: Single-page application (`index.html`) with modular TypeScript components
**Backend**: Deno server (`server.ts`) with server-side TypeScript transpilation
**ML Pipeline**: Main thread transformers.js with DistilBERT zero-shot classification  
**Runtime**: Deno with TypeScript support and automatic npm package resolution

## Key Components

### Core Files

- `index.html`: Main SPA entry point, loads modular TypeScript
- `js/app.ts`: Main application logic, UI event handling, provider routing
- `js/categories.ts`: **SINGLE SOURCE OF TRUTH** - All category definitions with auto-generated mappings
- `js/constants.ts`: Provider definitions and settings (imports from categories.ts)
- `js/ml.ts`: ML pipeline initialization and transformers.js integration
- `js/utils.ts`: Utility functions (DOM helpers, query encoding)
- `js/types.ts`: TypeScript type definitions for the application
- `server.ts`: Deno HTTP server with TypeScript transpilation
- `style.css`: CSS variables with light/dark mode support

### ML Classification System

- **Client-side main thread**: Browser does ALL ML work using transformers.js@2.17.2
- **Model**: `Xenova/distilbert-base-uncased-mnli` for zero-shot classification
- **Labels**: Auto-generated from `CATEGORIES` in `js/categories.ts` - currently supports movie, tv show, anime, video game, book, music, podcast, board game, and general
- **Fallback**: Robust heuristic classification using regex patterns defined per category
- **Performance**: ~100ms inference time, single attempt per query

### Provider Routing Logic

1. **Alias detection**: `!imdb The Matrix` → direct provider routing
2. **ML classification**: Main thread inference with loading states
3. **Heuristic fallback**: TV cues (`S01E02`), years (`2019`), game keywords
4. **Default provider**: Configurable fallback (localStorage)

## Development Workflow

### Initial Setup

```bash
# Download ML dependencies and bundle worker (first time only)
./scripts/get_deps.sh

# Or force re-download everything
./scripts/get_deps.sh --force
```

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
├── js/                 # Modular TypeScript components
│   ├── app.ts          # Main application logic
│   ├── constants.ts    # Providers, settings, mappings
│   ├── ml.ts           # ML pipeline integration
│   ├── utils.ts        # Utility functions
│   ├── types.ts        # TypeScript type definitions
│   └── worker-client.js # Web Worker client (legacy)
├── server.ts           # Deno server with TypeScript transpilation
├── style.css           # CSS with theme variables
├── deno.json           # Deno tasks and TypeScript configuration
├── compose.yml         # Docker Compose configuration
├── scripts/            # Build and setup scripts
│   └── get_deps.sh     # Download ML dependencies and bundle worker
├── llm-shared/         # Shared development guidelines (git submodule)
├── models/             # Local ML model cache (downloaded by script)
└── node_modules/       # Auto-managed Deno npm cache
```

## Key Implementation Details

### ML Integration (WORKING)

- **Main thread approach**: No Web Workers, ML runs in main thread with ~100ms blocking
- **Library loading**: CDN import via `await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2?v=5')`
- **Model**: `Xenova/distilbert-base-uncased-mnli` for zero-shot classification
- **Pipeline init**: `js/ml.ts` handles initialization with progress callbacks and error states
- **Classification flow**: `startClassification()` in `js/app.ts` → `initMLPipeline()` → main thread inference
- **Confidence scoring**: Only trusts ML if top score ≥60% and margin ≥15% from second choice
- **Error handling**: Single attempt with `mlInitAttempted` flag prevents console spam
- **UI feedback**: Real-time status in `#ml` element ("ML loading...", "ML ready", "ML unavailable")

### Provider Configuration

Providers defined in `PROVIDERS` array in `js/constants.ts`:

```javascript
{
  id: "imdb",
  name: "IMDb",
  url: "https://www.imdb.com/find/?q={q}",
  types: ["movie", "tv"],
  aliases: ["!imdb", "!i"],
  icon: "https://www.google.com/s2/favicons?domain=imdb.com" // Optional favicon
}
```

**Key Configuration Objects**:

- `PROVIDERS` (`js/constants.ts`): Array of search providers with URLs, types, aliases, and optional icons
- `CATEGORIES` (`js/categories.ts`): **SINGLE SOURCE OF TRUTH** - Category definitions with labels, default providers, types, and heuristic patterns
- `SETTINGS` (`js/constants.ts`): Local storage configuration (openInNewTab, pinned providers, etc.)
- `LABELS`, `LABEL_TO_PROVIDER`, `LABEL_TO_TYPE` (`js/categories.ts`): Auto-generated from `CATEGORIES`

### State Management

- localStorage: `pinnedProviders`, `defaultProvider`, `openInNewTab`, `region`
- No external state management - vanilla JS with DOM updates
- ML state: `MODEL.ready`, `MODEL.suggest`, `MODEL.scores`

## Technical Notes

### Deno Specifics

- Uses `deno.json` for task definitions, TypeScript configuration, and `nodeModulesDir: "auto"`
- **Server-side TypeScript transpilation**: Deno transpiles .ts files to JavaScript for browser
- **TypeScript support**: Full type checking with `deno task check`
- **Watch mode**: `deno task dev` auto-restarts server on file changes
- **No build step required**: TypeScript transpiled on-demand with caching

### ML Architecture Benefits

- **Simplified implementation**: Direct function calls without worker message passing
- **Reliable CDN loading**: Dynamic imports work consistently in main thread
- **Performance**: Minor UI freeze (~100ms) acceptable for search use case
- **Reliability**: Graceful degradation when CDN unavailable

### Browser Compatibility

- **Vanilla TypeScript**: No frameworks, works in all modern browsers
- **Dynamic imports**: Requires modern browser support for `import()`
- **CSS custom properties**: For theming and responsive design
- **Progressive enhancement**: Heuristics work when ML fails
- **TypeScript transpilation**: Server converts TypeScript to JavaScript for browser compatibility

## Common Development Tasks

### Adding New Categories/Provider Types

**IMPORTANT**: Use the centralized `CATEGORIES` system in `js/categories.ts`:

```javascript
// Add to CATEGORIES object in js/categories.ts
newtype: {
  label: "new type",
  defaultProvider: "provider-id",
  providerType: "newtype",
  heuristicPatterns: /\b(keyword1|keyword2)\b/i, // Optional regex for fallback
}
```

All mappings (`LABELS`, `LABEL_TO_PROVIDER`, `LABEL_TO_TYPE`) auto-generate from this config.

### Other Common Tasks

- **Add new provider**: Add to `PROVIDERS` array in `js/constants.ts` with proper `types` field
- **Modify heuristics**: Update regex patterns in category definitions (`js/categories.ts`)
- **Update styles**: Modify CSS custom properties in `:root` selectors in `style.css`
- **Debug ML**: Check browser console for CDN loading issues, monitor `js/ml.ts` status
- **Test providers**: Use keyboard shortcuts (Alt+0-9) or click chips to test routing
- **Type checking**: Run `deno task check` to verify TypeScript types
- **Add new interfaces**: Update `js/types.ts` for new data structures

## Current Status

### Working Features ✅

- **TypeScript transpilation**: Server-side TypeScript to JavaScript conversion
- **ML classification**: Main thread transformers.js working reliably
- **Heuristic fallback**: Robust pattern matching for all query types
- **Provider routing**: All keyboard shortcuts and UI interactions
- **Type safety**: Full TypeScript support with type checking
- **Error handling**: Clean ML failure states with user feedback

### Architecture Decisions

- **TypeScript with server transpilation**: Full type safety with runtime JavaScript conversion
- **No Service Worker**: Removed to eliminate cache-related ML loading issues
- **Main thread ML**: Simpler than Web Workers, reliable CDN loading
- **Client-side ML**: Server does zero ML processing, only serves transpiled files
- **Vanilla TypeScript**: No frameworks keeps bundle small and loading fast

### Dependency Management

**Local Dependencies**: Run `./scripts/get_deps.sh` to download:

- **transformers.js library**: Client-side ML inference engine
- **DistilBERT model files**: Zero-shot classification model (~50MB)
- **Worker bundle**: Bundled JavaScript for Web Worker compatibility

**When to re-run the script**:

- First time project setup
- After updating transformers.js version
- If ML models become corrupted
- When `worker.js` is modified

**Script features**:

- Smart caching (skips existing files)
- Progress indicators and error handling
- `--force` flag to re-download everything
- `--help` for usage information

### Development Guidelines

- **TypeScript first**: Write all new code in TypeScript with proper type annotations
- **Type safety**: Run `deno task check` before committing to verify types
- **Optional property access**: Use `(obj as any).optionalProp` when TypeScript can't guarantee property exists across union types
- **Categories system**: Always add new provider types via `CATEGORIES` in `js/categories.ts` - never manually update label mappings
- **Test ML thoroughly**: Clear browser cache if CDN URLs change
- **Focus on client-side**: Don't add server-side ML endpoints
- **Maintain fallbacks**: Heuristics should handle 95% of queries effectively
- **Cache busting**: Use URL parameters (`?v=X`) when changing CDN imports
- **Follow llm-shared conventions**: This project uses the shared development guidelines in `llm-shared/`
- **No build system needed**: Project runs directly with `deno task dev` - TypeScript transpiled on-demand
- **Branch workflow**: Never commit directly to main - use feature branches and PRs
- **Module structure**: Keep TypeScript modular in `js/` directory, avoid large monolithic files
- **Dependency script**: Use `./scripts/get_deps.sh` for ML dependencies, not npm/package managers
