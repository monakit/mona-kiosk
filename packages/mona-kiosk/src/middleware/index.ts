import { getEntry } from "astro:content";
import { defineMiddleware } from "astro:middleware";
import type { MiddlewareHandler } from "astro";
import { ACCESS_COOKIE_OPTIONS, COOKIE_NAMES } from "../constants";
import type {
  InheritAccessContext,
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
import { entryToContentId } from "../lib/content-id";
import {
  type DownloadableFile,
  getDownloadableFiles,
} from "../lib/downloadables";
import { renderErrorHtml } from "../lib/error-renderer";
import { buildUrlPatterns, parsePathname } from "../lib/i18n";
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
  body: string;
  /** If this content inherits access, this is the parent's content ID */
  parentContentId?: string;
  /** If inheriting access, this is the parent's price */
  parentPrice?: number;
  /** If inheriting access, this is the parent's currency */
  parentCurrency?: string;
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
    // Get preview handler (custom or default)
    const handler = previewHandler ?? getDefaultPreviewHandler(entry.body);

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
 * Check if URL matches a pattern
 */
function matchesUrlPattern(pathname: string, pattern: string): boolean {
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/\*\*/g, "___DOUBLESTAR___")
    .replace(/\*/g, "[^/]*")
    .replace(/___DOUBLESTAR___/g, ".*");

  const regex = new RegExp(`^${regexPattern}/?$`);
  return regex.test(pathname);
}

/**
 * Check if URL should be processed by paywall middleware
 * Only process URLs that match configured include patterns
 */
function shouldProcessUrl(
  pathname: string,
  includePatterns: string[],
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
  const urlPatterns = buildUrlPatterns(includePatterns, i18n);
  return urlPatterns.some((pattern) => matchesUrlPattern(pathname, pattern));
}

/**
 * Get content information from URL pathname
 */
async function getContentInfoFromPath(
  pathname: string,
  url: URL,
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

  // Check if collection is configured as payable
  // We need to match both collection name AND URL pattern (for cases where multiple
  // configs share the same base collection, e.g., courses/toc.md vs courses/chapters)
  const collectionConfig = config.collections.find((c) => {
    if (c.name !== collection) return false;

    // Build URL pattern from include pattern and check if current path matches
    const urlPattern = c.include
      .replace(/\\/g, "/")
      .replace(/^src\/content\//, "/")
      .replace(/\*\.\{[^}]+\}$/, "*")
      .replace(/\*\.(md|mdx)$/, "*");

    // Convert glob to regex
    const regexPattern = urlPattern
      .replace(/\*\*/g, "___DOUBLESTAR___")
      .replace(/\*/g, "[^/]*")
      .replace(/___DOUBLESTAR___/g, ".*");

    const regex = new RegExp(`^${regexPattern}/?$`);
    return regex.test(pathname);
  });
  if (!collectionConfig) return null;

  try {
    const entryKey = localePath ? `${localePath}/${slug}` : slug;
    // Use astroCollection to load from the correct Astro collection
    const astroCollection = collectionConfig.astroCollection;
    const entry = (await getEntry(
      astroCollection as never,
      entryKey,
    )) as unknown;

    if (!entry) return null;

    // Generate canonical content ID (collection/slug)
    const canonicalId = entryToContentId({
      collection,
      entryId: (entry as { id: string }).id,
      entrySlug: (entry as { slug?: string }).slug,
    });

    // Handle inheritAccess: child content inherits access from parent
    if (collectionConfig.inheritAccess) {
      const context: InheritAccessContext = {
        contentId: canonicalId,
        collection,
        slug,
        url,
      };

      const parentContentId =
        collectionConfig.inheritAccess.parentContentId(context);

      // If parentContentId returns null, content is free
      if (!parentContentId) {
        return null;
      }

      const cachedAccess = getAccessCookieEntry({
        payload: accessCookie,
        contentId: parentContentId,
        now,
      });
      const cachedProductId = cachedAccess?.productId ?? null;

      // Find parent's product in Polar if not cached
      const parentProductId =
        cachedProductId ?? (await findProductByContentId(parentContentId));

      if (!parentProductId) {
        // Parent product not found - treat as free (no paywall)
        console.warn(
          `[MonaKiosk] Parent product not found for: ${parentContentId}. Content will be treated as free.`,
        );
        return null;
      }

      // Get parent's price info from Polar (we need to query the product)
      // For now, we'll mark it as payable and let the access check handle it
      // The price will be fetched from the parent's product
      return {
        isPayable: true,
        productId: parentProductId,
        contentId: parentContentId, // Use parent's content ID for access check
        entry: entry as PayableEntry, // Child entry (for body/content)
        collection,
        collectionConfig,
        body: (entry as { body: string }).body,
        parentContentId,
      };
    }

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
    const includePatterns = config.collections.map((c) => c.include);

    // Skip URLs that don't match configured include patterns
    if (!shouldProcessUrl(url.pathname, includePatterns, config.i18n)) {
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
      url,
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
    // Skip preview for inheritAccess content (child content doesn't have its own preview)
    let preview: string | undefined;
    const isInheritedAccess = !!contentInfo.parentContentId;
    if (!hasAccess && !isInheritedAccess) {
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
    // For inheritAccess content, use parent's info (no price/interval on child)
    const interval =
      !isInheritedAccess && "interval" in contentInfo.entry.data
        ? contentInfo.entry.data.interval
        : undefined;

    // For inheritAccess content, downloads are on parent, not child
    const hasDownloads =
      !isInheritedAccess &&
      !!(
        contentInfo.entry.data.downloads &&
        contentInfo.entry.data.downloads.length > 0
      );
    const downloadCount = isInheritedAccess
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
      // For inheritAccess content, price is on parent, not child
      price: isInheritedAccess ? undefined : contentInfo.entry.data.price,
      currency: isInheritedAccess ? undefined : contentInfo.entry.data.currency,
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
