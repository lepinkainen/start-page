// Import generated types from categories
import type { ProviderType } from "./categories.ts";

// Core application types
export interface Provider {
  id: string;
  name: string;
  url: string | (() => string);
  types: ProviderType[];
  aliases: string[];
}

export interface Settings {
  region: string;
  openInNewTab: boolean;
  pinned: string[];
  defaultProvider: string | null;
}

export interface MLModel {
  enabled: boolean;
  ready: boolean;
  ctx: string;
  suggest: string | null;
  scores: Record<string, number> | null;
  runtime: number;
  inFlight: string | null;
  lastId: number;
}

export interface ClassificationResult {
  labels: string[];
  scores: number[];
}

export interface AliasResult {
  prov: Provider;
  rest: string;
}

// Transformers.js types
export interface MLPipeline {
  (text: string, labels: string[]): Promise<ClassificationResult>;
}

export interface TransformersModule {
  pipeline: (task: string, model: string, options?: any) => Promise<MLPipeline>;
  env: {
    allowLocalModels: boolean;
  };
}

// DOM utility types
export type QueryType =
  | "unknown"
  | "alias"
  | "tv"
  | "movie"
  | "game"
  | "general";

// Import generated types from categories
export type { LabelType, ProviderType } from "./categories.ts";