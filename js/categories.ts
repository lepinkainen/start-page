// Single source of truth for all ML categories
export interface CategoryConfig {
  label: string; // ML label for classification
  defaultProvider: string; // Default provider ID for this category
  providerType: string; // Type for filtering providers
  heuristicPatterns?: RegExp; // Optional patterns for fallback matching
}

// SINGLE SOURCE OF TRUTH - Just add new categories here!
export const CATEGORIES = {
  movie: {
    label: "movie",
    defaultProvider: "letterboxd",
    providerType: "movie",
    heuristicPatterns: /\b\d{4}\b/, // Years often indicate movies
  },
  tv: {
    label: "tv show",
    defaultProvider: "imdb",
    providerType: "tv",
    heuristicPatterns:
      /\b(tv|tv[-\s]?show|series|mini[-\s]?series|s\d{1,2}e\d{1,2}|season|episode|ep\s*\d{1,3})\b/i,
  },
  anime: {
    label: "anime",
    defaultProvider: "myanimelist",
    providerType: "anime",
    heuristicPatterns: /\b(anime|manga|crunchyroll)\b/i,
  },
  game: {
    label: "video game",
    defaultProvider: "opencritic",
    providerType: "game",
    heuristicPatterns:
      /\b(ps5|ps4|xbox|xb1|xbxs|series\s?[xs]|switch|nintendo|playstation|opencritic|metacritic|dlc)\b/i,
  },
  book: {
    label: "book",
    defaultProvider: "goodreads",
    providerType: "book",
    heuristicPatterns: /\b(book|author|novel|goodreads)\b/i,
  },
  music: {
    label: "music",
    defaultProvider: "spotify",
    providerType: "music",
    heuristicPatterns: /\b(music|album|artist|song|spotify|bandcamp)\b/i,
  },
  podcast: {
    label: "podcast",
    defaultProvider: "applepodcasts",
    providerType: "podcast",
    heuristicPatterns: /\b(podcast|episode|castbox|overcast)\b/i,
  },
  boardgame: {
    label: "board game",
    defaultProvider: "boardgamegeek",
    providerType: "boardgame",
    heuristicPatterns: /\b(boardgame|bgg|tabletop)\b/i,
  },
  general: {
    label: "general",
    defaultProvider: "kagi",
    providerType: "general",
  },
} as const;

// Auto-generate everything from CATEGORIES
export const LABELS = Object.values(CATEGORIES).map((c) => c.label);
export const LABEL_TO_PROVIDER = Object.fromEntries(
  Object.values(CATEGORIES).map((c) => [c.label, c.defaultProvider])
);
export const LABEL_TO_TYPE = Object.fromEntries(
  Object.values(CATEGORIES).map((c) => [c.label, c.providerType])
);

// Generate TypeScript types from the config
export type CategoryKey = keyof typeof CATEGORIES;
export type LabelType = (typeof CATEGORIES)[CategoryKey]["label"];
export type ProviderType =
  | (typeof CATEGORIES)[CategoryKey]["providerType"]
  | "code"; // code is special

// Export for use in app.ts heuristics
export function classifyByHeuristics(query: string): string | null {
  const normalized = query.toLowerCase().trim();

  for (const [key, config] of Object.entries(CATEGORIES)) {
    const patterns = (config as any).heuristicPatterns;
    if (patterns && patterns.test(normalized)) {
      return config.providerType;
    }
  }

  return null;
}
