import type { Provider, Settings } from "./types.ts";
import { LABEL_TO_PROVIDER, LABEL_TO_TYPE } from "./categories.ts";
import type { LabelType, ProviderType } from "./categories.ts";

export const SETTINGS: Settings = {
  region: localStorage.getItem("region") || "US",
  openInNewTab: JSON.parse(localStorage.getItem("openInNewTab") ?? "true"),
  pinned: JSON.parse(localStorage.getItem("pinnedProviders") || "[]"),
  defaultProvider: localStorage.getItem("defaultProvider") || null,
};

export const PROVIDERS: Provider[] = [
  {
    id: "imdb",
    name: "IMDb",
    url: "https://www.imdb.com/find/?q={q}",
    types: ["movie", "tv"],
    aliases: ["!imdb", "!i"],
  },
  {
    id: "letterboxd",
    name: "Letterboxd",
    url: "https://letterboxd.com/search/{q}",
    types: ["movie"],
    aliases: ["!lb", "!letterboxd"],
  },
  {
    id: "tmdb",
    name: "TMDb",
    url: "https://www.themoviedb.org/search?query={q}",
    types: ["movie", "tv"],
    aliases: ["!tmdb"],
  },
  {
    id: "trakt",
    name: "Trakt",
    url: "https://trakt.tv/search?query={q}",
    types: ["movie", "tv"],
    aliases: ["!trakt"],
  },
  {
    id: "opencritic",
    name: "OpenCritic",
    url: "https://duckduckgo.com/?q=site%3Aopencritic.com%2Fgame+{q}",
    types: ["game"],
    aliases: ["!oc", "!opencritic"],
  },
  {
    id: "metacritic",
    name: "Metacritic (Games)",
    url: "https://duckduckgo.com/?q=site%3Ametacritic.com%2Fgame+{q}",
    types: ["game"],
    aliases: ["!mc", "!metacritic"],
  },
  {
    id: "justwatch",
    name: "JustWatch",
    url: () =>
      `https://www.justwatch.com/${SETTINGS.region.toLowerCase()}/search?q={q}`,
    types: ["movie", "tv"],
    aliases: ["!jw", "!justwatch"],
  },
  {
    id: "rt",
    name: "Rotten Tomatoes",
    url: "https://www.rottentomatoes.com/search?search={q}",
    types: ["movie", "tv"],
    aliases: ["!rt"],
  },
  {
    id: "wikipedia",
    name: "Wikipedia",
    url: "https://en.wikipedia.org/w/index.php?search={q}",
    types: ["general"],
    aliases: ["!w", "!wp"],
  },
  {
    id: "kagi",
    name: "Kagi",
    url: "https://kagi.com/search?q={q}",
    types: ["general"],
    aliases: ["!k"],
  },
  {
    id: "ddg",
    name: "DuckDuckGo",
    url: "https://duckduckgo.com/?q={q}",
    types: ["general"],
    aliases: ["!ddg"],
  },
  {
    id: "google",
    name: "Google",
    url: "https://www.google.com/search?q={q}",
    types: ["general"],
    aliases: ["!g"],
  },
  {
    id: "youtube",
    name: "YouTube",
    url: "https://www.youtube.com/results?search_query={q}",
    types: ["general"],
    aliases: ["!yt"],
  },
  {
    id: "github",
    name: "GitHub",
    url: "https://github.com/search?q={q}",
    types: ["code"],
    aliases: ["!gh"],
  },
  {
    id: "stackoverflow",
    name: "Stack Overflow",
    url: "https://stackoverflow.com/search?q={q}",
    types: ["code"],
    aliases: ["!so"],
  },
];

// Re-export from categories.ts for backward compatibility
export { LABEL_TO_PROVIDER, LABEL_TO_TYPE } from "./categories.ts";