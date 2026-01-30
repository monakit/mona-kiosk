import { type CollectionEntry, getCollection, getEntry } from "astro:content";
import { defineMiddleware } from "astro:middleware";
import type { MiddlewareHandler } from "astro";
import { ACCESS_COOKIE_OPTIONS, COOKIE_NAMES } from "../constants";
import type {
  ResolvedCollectionConfig,
  ResolvedMonaKioskConfig,
} from "../integration/config";
import { getGlobalConfig } from "../integration/config";
import {
  type AccessCookiePayload,
  decodeAccessCookie,
  encodeAccessCookie,
  getAccessCookieEntry,
  upsertAccessCookie,
} from "../lib/access-cookie";
import { validateCustomerAccess } from "../lib/auth";
import { buildIndexIdCandidates, entryToContentId } from "../lib/content-id";
import {
  type DownloadableFile,
  getDownloadableFiles,
} from "../lib/downloadables";
import { renderErrorHtml } from "../lib/error-renderer";
import {
  buildUrlPatterns,
  includePatternToUrlPattern,
  parsePathname,
  stripLocalePrefix,
  type UrlPatternInput,
} from "../lib/i18n";
import { findProductByContentId } from "../lib/polar-client";
import {
  buildTemplateContext,
  getDefaultPaywallTemplate,
  getDefaultPreviewHandler,
  type PreviewHandler,
  renderDownloadableSection,
  renderTemplate,
} from "../lib/templates";
import type { PayableEntry } from "../schemas/payable";
import { isPayableEntry } from "../schemas/payable";

/**
 * Content information resolved from URL path
 */
interface ContentInfo {
  isPayable: boolean;
  productId: string;
  contentId: string;
  entry: PayableEntry;
  collection: string;
  collectionConfig: ResolvedCollectionConfig;
  body?: string;
  /** If this content inherits access from a group parent, this is the parent's content ID */
  parentContentId?: string;
}

/**
 * Build preview content using templates
 */
async function buildPreview(params: {
  collection: string;
  entry: PayableEntry;
  contentId: string;
  template?: string;
  previewHandler?: PreviewHandler;
  isAuthenticated: boolean;
  signinPagePath: string;
}): Promise<string | undefined> {
  const {
    collection,
    entry,
    contentId,
    template,
    previewHandler,
    isAuthenticated,
    signinPagePath,
  } = params;

  try {
    const markdown = entry.body;
    if (typeof markdown !== "string") {
      if (!previewHandler) {
        return undefined;
      }

      const previewContent = await previewHandler(entry);
      if (!previewContent) {
        return undefined;
      }

      const paywallTemplate = template ?? getDefaultPaywallTemplate();
      const context = buildTemplateContext({
        contentId,
        collection,
        entry,
        preview: previewContent,
        isAuthenticated,
        signinPagePath,
      });
      return renderTemplate(paywallTemplate, context);
    }

    // Get preview handler (custom or default)
    const handler = previewHandler ?? getDefaultPreviewHandler(markdown);

    // Generate preview content
    const previewContent = await handler(entry);
    if (!previewContent) {
      return undefined;
    }

    // Get template (custom or default)
    const paywallTemplate = template ?? getDefaultPaywallTemplate();

    // Build template context
    const context = buildTemplateContext({
      contentId,
      collection,
      entry,
      preview: previewContent,
      isAuthenticated,
      signinPagePath,
    });

    // Render final content with template
    return renderTemplate(paywallTemplate, context);
  } catch (error) {
    console.error("[MonaKiosk] Failed to build preview:", error);
    return renderErrorHtml({
      title: "Preview Generation Error",
      error,
    });
  }
}

/**
 * Inject HTML content before closing body tag
 */
async function injectHtmlBeforeBodyClose(
  response: Response,
  content: string,
): Promise<Response> {
  try {
    const html = await response.text();

    // Inject before closing </body> tag
    const modifiedHtml = html.replace("</body>", `${content}\n</body>`);

    return new Response(modifiedHtml, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    console.error("Failed to inject HTML content:", error);
    return response;
  }
}

/**
 * Convert a glob-style URL pattern to a RegExp
 */
function globToRegex(pattern: string): RegExp {
  const regexPattern = pattern
    .replace(/\*\*/g, "___DOUBLESTAR___")
    .replace(/\*/g, "[^/]*")
    .replace(/___DOUBLESTAR___/g, ".*");
  return new RegExp(`^${regexPattern}/?$`);
}

function shouldProcessUrl(
  pathname: string,
  collections: ResolvedCollectionConfig[],
  i18n?: ResolvedMonaKioskConfig["i18n"],
): boolean {
  // Skip API routes, assets, and other non-content paths
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_") ||
    pathname.startsWith("/assets/") ||
    pathname.includes(".")
  ) {
    return false;
  }

  // Convert include patterns to URL patterns and check
  const inputs: UrlPatternInput[] = collections.map((c) => ({
    include: c.include,
    group: c.group ? { index: c.group.index } : undefined,
  }));
  const urlPatterns = buildUrlPatterns(inputs, i18n);
  return urlPatterns.some((pattern) => globToRegex(pattern).test(pathname));
}

/**
 * Find the matching collection config for a given pathname and parsed info.
 * For group configs, also matches stripped index URLs (e.g., /courses/x matches
 * the pattern if /courses/x/{group.index} would match).
 */
function findCollectionConfig(
  pathname: string,
  collection: string,
  configs: ResolvedCollectionConfig[],
): ResolvedCollectionConfig | undefined {
  return configs.find((c) => {
    if (c.name !== collection) return false;

    const regex = globToRegex(includePatternToUrlPattern(c.include));
    if (regex.test(pathname)) {
      return true;
    }

    // For group configs, check if pathname + "/" + group.index matches
    if (c.group) {
      const indexPathname = `${pathname.replace(/\/+$/, "")}/${c.group.index}`;
      if (regex.test(indexPathname)) {
        return true;
      }
    }

    return false;
  });
}

const groupIndexCache = new Map<string, Set<string>>();

async function getGroupIndexIds(
  astroCollection: string,
  groupIndex: string,
): Promise<Set<string>> {
  const cacheKey = `${astroCollection}:${groupIndex}`;
  const cached = groupIndexCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const entries = (await getCollection(astroCollection)) as Array<
    CollectionEntry<string>
  >;
  const suffix = `/${groupIndex}`;
  const ids = new Set<string>();
  for (const entry of entries) {
    if (entry.id.endsWith(suffix)) {
      ids.add(entry.id);
    }
  }
  groupIndexCache.set(cacheKey, ids);
  return ids;
}

/**
 * Handle group content routing (index entries and child entries).
 *
 * Cases:
 * 1. Last slug segment === group.index -> index entry (e.g., /courses/x/toc)
 * 2. Else, try slug + "/" + group.index as entry -> stripped index URL (e.g., /courses/x)
 * 3. Otherwise -> child entry (e.g., /courses/x/01-basics)
 */
async function getGroupContentInfo(params: {
  collectionConfig: ResolvedCollectionConfig;
  collection: string;
  slug: string;
  localePath: string | null;
  accessCookie: AccessCookiePayload | null;
  now: number;
}): Promise<ContentInfo | null> {
  const { collectionConfig, collection, slug, localePath, accessCookie, now } =
    params;
  const group = collectionConfig.group;
  if (!group) return null;

  const astroCollection = collectionConfig.astroCollection;
  const slugSegments = slug.split("/");
  const lastSegment = slugSegments[slugSegments.length - 1];

  // Case 1: Direct index URL (e.g., /courses/git-essentials/toc)
  if (lastSegment === group.index) {
    const entryKey = localePath ? `${localePath}/${slug}` : slug;
    const entry = await getEntry(astroCollection, entryKey);
    if (!entry) return null;

    return buildIndexContentInfo({
      entry,
      collection,
      collectionConfig,
      accessCookie,
      now,
    });
  }

  // Case 2: Stripped index URL (e.g., /courses/git-essentials)
  const childCollection = group.childCollection ?? astroCollection;

  const indexIds = await getGroupIndexIds(astroCollection, group.index);
  const indexCandidates = buildIndexIdCandidates({
    localePath,
    slug,
    groupIndex: group.index,
  });
  const matchedIndexId = indexCandidates.find((id) => indexIds.has(id));
  if (matchedIndexId) {
    const indexEntry = await getEntry(astroCollection, matchedIndexId);
    if (!indexEntry) return null;

    // This is a stripped index URL — serve the index entry
    return buildIndexContentInfo({
      entry: indexEntry,
      collection,
      collectionConfig,
      accessCookie,
      now,
    });
  }

  // Case 2: Child entry (e.g., /courses/git-essentials/01-basics)
  const childEntryKey = localePath ? `${localePath}/${slug}` : slug;
  const childEntry = await getEntry(childCollection, childEntryKey);

  if (!childEntry) return null;

  // Derive parent: all segments except last + group.index
  const parentSlug = `${slugSegments.slice(0, -1).join("/")}/${group.index}`;
  const parentEntryKey = localePath
    ? `${localePath}/${parentSlug}`
    : parentSlug;
  const parentEntry = await getEntry(astroCollection, parentEntryKey);

  if (!parentEntry) {
    console.warn(
      `[MonaKiosk] Parent entry not found for child: ${slug}. Expected parent at: ${parentSlug}`,
    );
    return null;
  }

  // Parent's content ID
  const parentContentId = entryToContentId({
    collection,
    entryId: (parentEntry as { id: string }).id,
    entrySlug: (parentEntry as { slug?: string }).slug,
  });

  const cachedAccess = getAccessCookieEntry({
    payload: accessCookie,
    contentId: parentContentId,
    now,
  });
  const cachedProductId = cachedAccess?.productId ?? null;

  const parentProductId =
    cachedProductId ?? (await findProductByContentId(parentContentId));

  if (!parentProductId) {
    console.warn(
      `[MonaKiosk] Parent product not found for: ${parentContentId}. Content will be treated as free.`,
    );
    return null;
  }

  return {
    isPayable: true,
    productId: parentProductId,
    contentId: parentContentId,
    entry: childEntry as PayableEntry,
    collection,
    collectionConfig,
    body: (childEntry as { body: string }).body,
    parentContentId,
  };
}

/**
 * Build ContentInfo for a group index entry (the pricing page).
 */
async function buildIndexContentInfo(params: {
  entry: unknown;
  collection: string;
  collectionConfig: ResolvedCollectionConfig;
  accessCookie: AccessCookiePayload | null;
  now: number;
}): Promise<ContentInfo | null> {
  const { entry, collection, collectionConfig, accessCookie, now } = params;

  if (!isPayableEntry(entry)) {
    return null;
  }

  const canonicalId = entryToContentId({
    collection,
    entryId: (entry as { id: string }).id,
    entrySlug: (entry as { slug?: string }).slug,
  });

  const cachedAccess = getAccessCookieEntry({
    payload: accessCookie,
    contentId: canonicalId,
    now,
  });
  const cachedProductId = cachedAccess?.productId ?? null;

  const productId =
    cachedProductId ?? (await findProductByContentId(canonicalId));

  if (!productId) {
    console.error(
      `[MonaKiosk] Product not found in Polar for content: ${canonicalId}. Make sure to run a build first to sync products.`,
    );
    return null;
  }

  return {
    isPayable: true,
    productId,
    contentId: canonicalId,
    entry,
    collection,
    collectionConfig,
    body: entry.body,
  };
}

/**
 * Get content information from URL pathname
 */
async function getContentInfoFromPath(
  pathname: string,
  accessCookie: AccessCookiePayload | null,
  now: number,
): Promise<ContentInfo | null> {
  const config = getGlobalConfig();

  const parsed = parsePathname(pathname, config.i18n);
  if (!parsed) return null;
  const { collection, slug, localePath } = parsed;

  if (slug.includes(".")) {
    return null;
  }

  // Find matching collection config (supports group stripped-index URLs)
  const matchPathname = stripLocalePrefix(pathname, localePath);
  const collectionConfig = findCollectionConfig(
    matchPathname,
    collection,
    config.collections,
  );
  if (!collectionConfig) return null;

  try {
    // Group config path
    if (collectionConfig.group) {
      return getGroupContentInfo({
        collectionConfig,
        collection,
        slug,
        localePath,
        accessCookie,
        now,
      });
    }

    // Normal (non-group) flow
    const entryKey = localePath ? `${localePath}/${slug}` : slug;
    const astroCollection = collectionConfig.astroCollection;
    const entry = await getEntry(astroCollection, entryKey);

    if (!entry) return null;

    // Generate canonical content ID (collection/slug)
    const canonicalId = entryToContentId({
      collection,
      entryId: (entry as { id: string }).id,
      entrySlug: (entry as { slug?: string }).slug,
    });

    // Normal flow: Check if content has price field (is payable)
    if (!isPayableEntry(entry)) {
      return null;
    }

    const cachedAccess = getAccessCookieEntry({
      payload: accessCookie,
      contentId: canonicalId,
      now,
    });
    const cachedProductId = cachedAccess?.productId ?? null;

    // Query Polar to get product ID by content_id metadata
    const productId =
      cachedProductId ?? (await findProductByContentId(canonicalId));

    if (!productId) {
      console.error(
        `[MonaKiosk] Product not found in Polar for content: ${canonicalId}. Make sure to run a build first to sync products.`,
      );
      return null;
    }

    return {
      isPayable: true,
      productId,
      contentId: canonicalId,
      entry,
      collection,
      collectionConfig,
      body: entry.body,
    };
  } catch (error) {
    console.error("Error loading content:", error);
    return null;
  }
}

/**
 * Paywall state stored in Astro.locals for page templates to access
 * This interface describes the authentication and access state for payable content
 */
export interface PaywallState {
  /** Whether the current content has a price and is protected */
  isPayable: boolean;
  /** Whether the user has an active customer session */
  isAuthenticated: boolean;
  /** Whether the authenticated user has purchased access to this content */
  hasAccess: boolean;
  /** Polar product ID for this content */
  productId: string;
  /** Canonical content ID (collection/slug) */
  contentId: string;
  /** Price in cents */
  price?: number;
  /** Currency code */
  currency?: string;
  /** Billing interval for subscriptions */
  interval?: "month" | "year" | "week" | "day";
  /** Content title */
  title?: string;
  /** Content description */
  description?: string;
  /** Preview HTML to render for users without access (includes paywall UI) */
  preview?: string;
  /** Whether this content has downloadable files */
  hasDownloads: boolean;
  /** Number of downloadable files */
  downloadCount?: number;
  /** Downloadable files (only populated if hasAccess && hasDownloads) */
  downloadableFiles?: DownloadableFile[];
  /** Rendered downloadable section HTML (only if hasAccess && hasDownloads) */
  downloadableSection?: string;
}

/**
 * Middleware handler - ALWAYS enabled
 * Sets paywall state in Astro.locals for pages to handle rendering
 */
export const onRequest: MiddlewareHandler = defineMiddleware(
  async (context, next) => {
    // Load config in production if not already initialized
    let config: ResolvedMonaKioskConfig;
    try {
      config = getGlobalConfig();
    } catch {
      const virtualConfig = await import("virtual:mona-kiosk-config");
      globalThis.__MONA_KIOSK_CONFIG__ = virtualConfig.default;
      config = virtualConfig.default;
    }

    const { url, cookies, locals } = context;

    // Skip URLs that don't match configured include patterns
    if (!shouldProcessUrl(url.pathname, config.collections, config.i18n)) {
      return next();
    }

    const now = Math.floor(Date.now() / 1000);
    const accessCookieSecret = config.accessCookieSecret;
    const accessCookie = accessCookieSecret
      ? decodeAccessCookie({
          value: cookies.get(COOKIE_NAMES.ACCESS)?.value,
          secret: accessCookieSecret,
          now,
        })
      : null;

    // Check if current path is for payable content
    const contentInfo = await getContentInfoFromPath(
      url.pathname,
      accessCookie,
      now,
    );

    // If not payable content, continue normally
    if (!contentInfo || !contentInfo.isPayable) {
      return next();
    }

    // Content is payable - check authentication and access
    let isAuthenticated = false;
    let hasAccess = false;
    let customerToken: string | undefined;
    let customerId: string | undefined;

    // First, try to get session from cookies
    customerToken = cookies.get(COOKIE_NAMES.SESSION)?.value;
    customerId = cookies.get(COOKIE_NAMES.CUSTOMER_ID)?.value;

    // If no cookie, check URL parameters (e.g., from Polar redirect)
    if (!customerToken || !customerId) {
      const urlToken = url.searchParams.get("customer_session_token");
      if (urlToken) {
        // Validate token and get customer info
        const { getCustomerFromToken, setSessionCookie } = await import(
          "../lib/auth"
        );
        const customerInfo = await getCustomerFromToken(urlToken);

        if (customerInfo) {
          customerToken = urlToken;
          customerId = customerInfo.id;

          // Set cookies for future requests (30 days expiration)
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30);

          setSessionCookie(
            cookies,
            customerToken,
            expiresAt,
            customerId,
            customerInfo.email,
          );
        }
      }
    }

    const accessCookieEntry = getAccessCookieEntry({
      payload: accessCookie,
      contentId: contentInfo.contentId,
      now,
    });
    const hasCookieAccess = !!accessCookieEntry;

    // Check authentication
    if (hasCookieAccess) {
      isAuthenticated = true;
    } else if (config.isAuthenticated) {
      // Use custom auth check
      isAuthenticated = await config.isAuthenticated(context);
    } else {
      // Default: check if we have session (from cookie or URL)
      isAuthenticated = !!(customerToken && customerId);
    }

    // Check access (only if authenticated)
    if (hasCookieAccess) {
      hasAccess = true;
    } else if (isAuthenticated && customerToken && customerId) {
      if (config.checkAccess) {
        // Use custom access check
        hasAccess = await config.checkAccess(context, contentInfo.contentId);
      } else {
        // Default: validate via Polar API
        hasAccess = await validateCustomerAccess(customerToken, {
          customerId: customerId,
          contentId: contentInfo.contentId,
        });
      }
    }

    if (accessCookieSecret && hasAccess) {
      const nextPayload = upsertAccessCookie({
        payload: accessCookie,
        contentId: contentInfo.contentId,
        productId: contentInfo.productId,
        now,
        ttlSeconds: config.accessCookieTtlSeconds,
        maxEntries: config.accessCookieMaxEntries,
      });
      const value = encodeAccessCookie({
        payload: nextPayload,
        secret: accessCookieSecret,
      });
      cookies.set(COOKIE_NAMES.ACCESS, value, {
        ...ACCESS_COOKIE_OPTIONS,
        expires: new Date(nextPayload.exp * 1000),
      });
    }

    // Only generate preview if user doesn't have access
    // Skip preview for group child content (child content doesn't have its own preview)
    let preview: string | undefined;
    const isGroupChild = !!contentInfo.parentContentId;
    if (!hasAccess && !isGroupChild) {
      preview = await buildPreview({
        collection: contentInfo.collection,
        entry: contentInfo.entry,
        contentId: contentInfo.contentId,
        template: contentInfo.collectionConfig.paywallTemplate,
        previewHandler: contentInfo.collectionConfig.previewHandler,
        isAuthenticated,
        signinPagePath: config.signinPagePath,
      });
    }

    // Set paywall state in locals for page to access
    // For group child content, use parent's info (no price/interval on child)
    const interval =
      !isGroupChild && "interval" in contentInfo.entry.data
        ? contentInfo.entry.data.interval
        : undefined;

    // For group child content, downloads are on parent, not child
    const hasDownloads =
      !isGroupChild &&
      !!(
        contentInfo.entry.data.downloads &&
        contentInfo.entry.data.downloads.length > 0
      );
    const downloadCount = isGroupChild
      ? 0
      : contentInfo.entry.data.downloads?.length || 0;

    // Fetch downloadable files if user has access
    let downloadableFiles: DownloadableFile[] | undefined;
    let downloadableSection: string | undefined;

    if (hasAccess && hasDownloads) {
      // Use the customerToken we already have (from cookie or URL)
      downloadableFiles = await getDownloadableFiles({
        contentId: contentInfo.contentId,
        customerToken,
      });

      if (downloadableFiles.length > 0) {
        // Render downloadable section with custom or default template
        const downloadableTemplate =
          contentInfo.collectionConfig.downloadableTemplate;
        downloadableSection = renderDownloadableSection({
          files: downloadableFiles,
          template: downloadableTemplate,
        });
      }
    }

    locals.paywall = {
      isPayable: true,
      isAuthenticated,
      hasAccess,
      productId: contentInfo.productId,
      contentId: contentInfo.contentId,
      // For group child content, price is on parent, not child
      price: isGroupChild ? undefined : contentInfo.entry.data.price,
      currency: isGroupChild ? undefined : contentInfo.entry.data.currency,
      interval,
      title: contentInfo.entry.data.title,
      description: contentInfo.entry.data.description,
      preview: preview ?? undefined,
      hasDownloads,
      downloadCount,
      downloadableFiles,
      downloadableSection,
    } satisfies PaywallState;

    // Render page and inject downloadable section if needed
    const response = await next();

    // Inject downloadable section into HTML if user has access and there are downloads
    if (
      downloadableSection &&
      response.headers.get("content-type")?.includes("text/html")
    ) {
      return injectHtmlBeforeBodyClose(response, downloadableSection);
    }

    return response;
  },
);
