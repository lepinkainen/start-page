# Smart Start - AI-Powered Search Launcher

A Deno-based web application that intelligently routes search queries to appropriate providers (IMDb, Letterboxd, OpenCritic, etc.) using ML classification.

## Architecture Overview

**Frontend**: Single-page application (`index.html`) with vanilla JavaScript
**Backend**: Deno server (`server.ts`) serving static files and ML classification API
**ML Pipeline**: Uses Transformers.js with DistilBERT for zero-shot classification
**Runtime**: Deno with automatic npm package resolution

## Key Components

### Core Files

- `index.html`: Complete SPA with embedded JS, handles UI and query classification
- `server.ts`: Deno HTTP server with `/classify` endpoint for ML inference
- `worker.js`: Web Worker for client-side ML (alternative to server classification)
- `style.css`: CSS variables with light/dark mode support

### ML Classification System

- **Server-side**: Uses `@xenova/transformers@2.15.1` with WASM backend
- **Client-side**: Web Worker with UMD builds for Firefox compatibility
- **Model**: `Xenova/distilbert-base-uncased-mnli` for zero-shot classification
- **Labels**: `["movie", "tv show", "video game", "programming", "general"]`

### Provider Routing Logic

1. **Alias detection**: `!imdb The Matrix` → direct provider routing
2. **ML classification**: Server POST to `/classify` endpoint
3. **Heuristic fallback**: TV cues (`S01E02`), years (`2019`), game keywords
4. **Default provider**: Configurable fallback (localStorage)

## Development Workflow

### Running the Application

```bash
# Local development
deno run -A server.ts

# Docker Compose (recommended)
docker compose up
# Both serve at http://127.0.0.1:8080
```

### Project Structure

```text
/
├── index.html          # Main SPA with embedded JavaScript
├── server.ts           # Deno server with ML classification
├── worker.js           # Client-side ML worker (alternative)
├── style.css           # CSS with theme variables
├── compose.yml         # Docker Compose configuration
├── deno.json           # Deno configuration
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

### ML Integration

- Server endpoint accepts `{ text: string }` POST to `/classify`
- Returns `{ label, scores, ms }` with classification results
- Client trusts model when top score ≥60% and gap to second ≥15%

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

- Uses `deno.json` for basic configuration (`nodeModulesDir: "auto"`)
- Imports use npm specifiers: `npm:@xenova/transformers@2.15.1`
- No build step required - serves static files directly

### ML Configuration

- WASM backend to avoid COOP/COEP requirements
- Single-threaded to prevent browser compatibility issues
- Quantized model for faster inference
- Transformers disable sharp: `TRANSFORMERS_DISABLE_SHARP=1`

### Browser Compatibility

- Uses vanilla JS (no frameworks)
- CSS custom properties for theming
- Web Worker for non-blocking ML inference
- Progressive enhancement approach

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
- **Adjust ML labels**: Update both `labels` in `server.ts` and `LABELS`/`LABEL_TO_PROVIDER` in `index.html`
- **Modify classification logic**: Edit `classifyQuery()` function for heuristics
- **Change styling**: Update CSS custom properties in `:root` selectors
- **Debug ML issues**: Check browser console for worker errors and network requests to `/classify`
