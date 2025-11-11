import type { APIContext } from "astro";
import type { PreviewHandler } from "../lib/templates";

export interface PolarConfig {
  accessToken: string;
  organizationId: string;
  organizationSlug: string;
  server: "production" | "sandbox";
}

export interface CollectionConfig {
  include: string;
  paywallTemplate?: string;
  previewHandler?: PreviewHandler;
}

export interface MonaKioskConfig {
  polar: PolarConfig;
  collections: CollectionConfig[];
  productNameTemplate?: string;
  signinPagePath?: string;
  isAuthenticated?: (context: APIContext) => boolean | Promise<boolean>;
  checkAccess?: (
    context: APIContext,
    contentId: string,
  ) => boolean | Promise<boolean>;
}

export type ResolvedCollectionConfig = CollectionConfig & {
  name: string;
  include: string;
};

export type ResolvedMonaKioskConfig = Omit<
  MonaKioskConfig,
  "collections" | "signinPagePath"
> & {
  collections: ResolvedCollectionConfig[];
  signinPagePath: string;
};

// Dev server: Astro middleware runs in isolated V8 context, can't access module variables
// Solution: Use globalThis (shared across all contexts) + local cache (performance)
declare global {
  var __MONA_KIOSK_CONFIG__: ResolvedMonaKioskConfig | undefined;
}

// Local cache for same-context access (performance optimization)
let config: ResolvedMonaKioskConfig | null = null;

function inferCollectionName(include: string | undefined): string | null {
  if (!include) {
    return null;
  }

  const cleaned = include.replace(/\\/g, "/");
  const match = cleaned.match(/src\/content\/([^/*]+)\/?/);
  if (match?.[1]) {
    return match[1];
  }

  const segments = cleaned.split("/");
  const contentIndex = segments.indexOf("content");
  if (contentIndex >= 0 && contentIndex + 1 < segments.length) {
    return segments[contentIndex + 1];
  }

  return null;
}

function resolveCollectionConfig(
  collection: CollectionConfig,
): ResolvedCollectionConfig {
  const inferredName = inferCollectionName(collection.include);

  if (!inferredName) {
    throw new Error(
      `MonaKiosk collection name could not be inferred from include pattern: "${collection.include}". ` +
        `Please ensure the path follows Astro conventions (e.g., "src/content/{collection}/**/*.md").`,
    );
  }

  return {
    ...collection,
    name: inferredName,
    include: collection.include,
  };
}

function resolveConfig(input: MonaKioskConfig): ResolvedMonaKioskConfig {
  return {
    ...input,
    collections: input.collections.map(resolveCollectionConfig),
    signinPagePath: input.signinPagePath ?? "/mona-kiosk/signin",
  };
}

export function setGlobalConfig(
  input: MonaKioskConfig,
): ResolvedMonaKioskConfig {
  const resolved = resolveConfig(input);
  config = resolved; // Local cache
  globalThis.__MONA_KIOSK_CONFIG__ = resolved; // Cross-context storage (preserves function handlers)

  return resolved;
}

export function getGlobalConfig(): ResolvedMonaKioskConfig {
  // Fast path: local cache (same context)
  if (config) {
    return config;
  }

  // Fallback: globalThis (middleware in different context during dev)
  if (globalThis.__MONA_KIOSK_CONFIG__) {
    config = globalThis.__MONA_KIOSK_CONFIG__; // Cache locally
    return config;
  }

  throw new Error("MonaKiosk config not initialized");
}
