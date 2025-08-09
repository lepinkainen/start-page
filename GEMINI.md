# Gemini Start Page Guide

This document provides essential information for an AI agent to be productive in the Smart Start codebase.

## Project Overview

Smart Start is a Deno-based web application that intelligently routes search queries to the most appropriate provider (e.g., IMDb, Letterboxd, OpenCritic) using **client-side ML classification**.

The core of the application runs in the browser, with a Deno server providing on-the-fly TypeScript transpilation.

## Architecture

The application follows a client-heavy architecture. The main components are:

-   **Frontend**: A single-page application built with vanilla TypeScript. The main entry point is `index.html`, and the core logic resides in `js/app.ts`.
-   **Backend**: A simple Deno server (`server.ts`) that serves the frontend and transpiles TypeScript to JavaScript.
-   **ML Pipeline**: A zero-shot classification pipeline using `Xenova/distilbert-base-uncased-mnli` from `transformers.js`. The entire ML pipeline runs in a web worker to avoid blocking the main thread.

### Data Flow

1.  The user enters a query in the input field on the `index.html` page.
2.  `js/app.ts` captures the input and sends it to the web worker via `js/ml.ts` and `js/worker-client.js`.
3.  `worker.js` receives the query, classifies it using the Xenova.js pipeline, and sends the results (labels and scores) back to the main thread.
4.  `js/app.ts` receives the classification results, determines the recommended search provider based on a combination of the ML suggestion and heuristics, and updates the UI to show the recommended provider and other relevant information.

## Developer Workflow

### Running the Application

-   **Development**: `deno task dev`
    -   Starts the server with a file watcher for auto-reloading.
-   **Production**: `deno task start`

### Type Checking

-   `deno task check`: Type-checks the local TypeScript files.
-   `deno task check-all`: Type-checks all files, including remote dependencies.

### Dependencies

-   Dependencies are managed via the `./scripts/get_deps.sh` script, which downloads the required ML models and libraries.

## Key Conventions

-   **Client-Side Logic**: The vast majority of the application's logic is on the client-side, written in TypeScript. The server is kept as simple as possible.
-   **Web Workers for ML**: All ML-related tasks are handled in a web worker (`worker.js`) to ensure the UI remains responsive. Communication with the worker is managed by `js/worker-client.js`.
-   **Configuration via Constants**: The application is configured through constants defined in `js/constants.ts`. This includes the list of search providers, ML labels, and default settings.
-   **UI Updates**: The UI is updated dynamically using vanilla TypeScript in `js/app.ts`. There is no complex frontend framework.

## How to Add or Modify a Search Provider

To add or modify a search provider, you need to edit the `PROVIDERS` array in `js/constants.ts`. Each provider is an object with the following structure:

```typescript
{
  id: "imdb", // Unique identifier
  name: "IMDb", // Display name
  url: "https://www.imdb.com/find/?q={q}", // Search URL template
  types: ["movie", "tv"], // Associated query types
  aliases: ["!imdb", "!i"] // Bang aliases
}
```

After modifying the `PROVIDERS` array, the changes will be reflected in the UI automatically.
