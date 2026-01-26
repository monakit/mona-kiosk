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
 * Context passed to inheritAccess.parentContentId resolver
 */
export interface InheritAccessContext {
  /** Child's canonical content ID (e.g., "courseChapters/my-course/01-intro") */
  contentId: string;
  /** Child's collection name */
  collection: string;
  /** Child's slug (e.g., "my-course/01-intro") */
  slug: string;
  /** Request URL */
  url: URL;
}

/**
 * Configuration for content that inherits access from parent content
 */
export interface InheritAccessConfig {
  /**
   * Function to resolve parent's content ID from child's info
   * @returns Parent's content ID (e.g., "courses/my-course/toc"), or null if should be free
   */
  parentContentId: (context: InheritAccessContext) => string | null;
}

export interface CollectionConfig {
  include: string;
  paywallTemplate?: string;
  downloadableTemplate?: string;
  previewHandler?: PreviewHandler;
  /**
   * For child content that inherits access from parent content.
   * When set, this collection's content will check parent's access instead of its own.
   * Products are NOT created for collections with inheritAccess.
   */
  inheritAccess?: InheritAccessConfig;
  /**
   * The Astro collection name to load entries from.
   * Useful when the URL path doesn't match the Astro collection name
   * (e.g., URL is /courses/... but Astro collection is "courseChapters").
   * If not specified, uses the collection name inferred from the include pattern.
   */
  astroCollection?: string;
  /**
   * Transform content ID to URL path.
   * Used for building success URLs after checkout and content URLs in Polar.
   * Example: "courses/my-course/toc" -> "courses/my-course"
   */
  contentIdToUrl?: (contentId: string) => string;
}

export interface MonaKioskConfig {
  polar: PolarConfig;
  collections: CollectionConfig[];
  productNameTemplate?: string;
  signinPagePath?: string;
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

export type ResolvedCollectionConfig = Omit<
  CollectionConfig,
  "inheritAccess" | "contentIdToUrl"
> & {
  name: string;
  include: string;
  inheritAccess?: InheritAccessConfig;
  /** The Astro collection to load entries from (defaults to name if not specified) */
  astroCollection: string;
  /** Transform content ID to URL path */
  contentIdToUrl?: (contentId: string) => string;
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
