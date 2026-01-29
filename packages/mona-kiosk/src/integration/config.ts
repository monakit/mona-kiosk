import type { APIContext, AstroConfig } from "astro";
import { type ResolvedI18nConfig, resolveI18nConfig } from "../lib/i18n";
import type { PreviewHandler } from "../lib/templates";

export interface PolarConfig {
  accessToken: string;
  organizationId: string;
  organizationSlug: string;
  server: "production" | "sandbox";
}

/**
 * Configuration for grouped content (e.g., courses with chapters).
 * A single collection config handles both the index entry (pricing page)
 * and child entries (chapters that inherit access from the index).
 */
export interface GroupConfig {
  /** Filename stem of the pricing/index entry (e.g., "toc") */
  index: string;
  /** Astro collection name for child entries (optional) */
  childCollection?: string;
}

export interface CollectionConfig {
  include: string;
  paywallTemplate?: string;
  downloadableTemplate?: string;
  previewHandler?: PreviewHandler;
  /**
   * The Astro collection name to load entries from.
   * Useful when the URL path doesn't match the Astro collection name
   * (e.g., URL is /courses/... but Astro collection is "courseChapters").
   * If not specified, uses the collection name inferred from the include pattern.
   */
  astroCollection?: string;
  /**
   * Configuration for grouped content (e.g., courses with chapters).
   * When set, the index entry (matching group.index filename) is the pricing entry,
   * and all other entries inherit access from their parent index.
   */
  group?: GroupConfig;
}

export interface MonaKioskConfig {
  polar: PolarConfig;
  collections: CollectionConfig[];
  productNameTemplate?: string;
  signinPagePath?: string;
  middlewareOrder?: "pre" | "post";
  siteUrl: string;
  accessCookieSecret?: string;
  accessCookieTtlSeconds?: number;
  accessCookieMaxEntries?: number;
  isAuthenticated?: (context: APIContext) => boolean | Promise<boolean>;
  checkAccess?: (
    context: APIContext,
    contentId: string,
  ) => boolean | Promise<boolean>;
}

export type ResolvedCollectionConfig = Omit<CollectionConfig, never> & {
  name: string;
  include: string;
  /** The Astro collection to load entries from (defaults to name if not specified) */
  astroCollection: string;
  group?: GroupConfig;
};

export type ResolvedMonaKioskConfig = Omit<
  MonaKioskConfig,
  "collections" | "signinPagePath" | "siteUrl"
> & {
  collections: ResolvedCollectionConfig[];
  signinPagePath: string;
  siteUrl: string;
  accessCookieSecret?: string;
  accessCookieTtlSeconds: number;
  accessCookieMaxEntries: number;
  i18n?: ResolvedI18nConfig | null;
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
    astroCollection: collection.astroCollection ?? inferredName,
  };
}

function resolveConfig(
  input: MonaKioskConfig,
  options?: { astroI18n?: AstroConfig["i18n"] },
): ResolvedMonaKioskConfig {
  if (!input.accessCookieSecret) {
    throw new Error(
      "MonaKiosk accessCookieSecret is required to enable access cookie caching.",
    );
  }

  return {
    ...input,
    collections: input.collections.map(resolveCollectionConfig),
    signinPagePath: input.signinPagePath ?? "/mona-kiosk/signin",
    siteUrl: input.siteUrl,
    accessCookieSecret: input.accessCookieSecret,
    accessCookieTtlSeconds: input.accessCookieTtlSeconds ?? 60 * 30,
    accessCookieMaxEntries: input.accessCookieMaxEntries ?? 20,
    i18n: resolveI18nConfig(options?.astroI18n),
  };
}

export function setGlobalConfig(
  input: MonaKioskConfig,
  options?: { astroI18n?: AstroConfig["i18n"] },
): ResolvedMonaKioskConfig {
  const resolved = resolveConfig(input, options);
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
