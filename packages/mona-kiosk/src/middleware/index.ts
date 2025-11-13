import type { CollectionEntry } from "astro:content";
import { getEntry } from "astro:content";
import { defineMiddleware } from "astro:middleware";
import type { MiddlewareHandler } from "astro";
import { COOKIE_NAMES } from "../constants";
import type {
  ResolvedCollectionConfig,
  ResolvedMonaKioskConfig,
} from "../integration/config";
import { getGlobalConfig } from "../integration/config";
import { hasPolarSession, validateCustomerAccess } from "../lib/auth";
import { entryToContentId } from "../lib/content-id";
import {
  type DownloadableFile,
  getDownloadableFiles,
} from "../lib/downloadables";
import { renderErrorHtml } from "../lib/error-renderer";
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
 * Convert include pattern to URL pattern
 * Example: "src/content/blogs/**\/*.md" -> "/blogs/**\/*"
 */
function includePatternToUrlPattern(includePattern: string): string {
  return (
    includePattern
      .replace(/\\/g, "/")
      // Remove src/content/ prefix
      .replace(/^src\/content\//, "/")
      // Remove file extensions (*.md, *.mdx, *.{md,mdx})
      .replace(/\*\.\{[^}]+\}$/, "*")
      .replace(/\*\.(md|mdx)$/, "*")
  );
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
  const urlPatterns = includePatterns.map(includePatternToUrlPattern);
  return urlPatterns.some((pattern) => matchesUrlPattern(pathname, pattern));
}

/**
 * Get content information from URL pathname
 */
async function getContentInfoFromPath(
  pathname: string,
): Promise<ContentInfo | null> {
  const config = getGlobalConfig();

  // Try to match pathname pattern: /:collection/:slug (slug can have multiple segments)
  // Example: /blogs/2025-08/groq-code-cli-internal -> collection: blogs, slug: 2025-08/groq-code-cli-internal
  const match = pathname.match(/^\/([^/]+)\/(.+?)\/?$/);
  if (!match) return null;

  const [, collection, slug] = match;

  if (slug.includes(".")) {
    return null;
  }

  // Check if collection is configured as payable
  const collectionConfig = config.collections.find(
    (c) => c.name === collection,
  );
  if (!collectionConfig) return null;

  try {
    const entry = (await getEntry(collection as never, slug)) as
      | CollectionEntry<never>
      | undefined;

    if (!entry) return null;

    // Check if content has price field (is payable)
    if (!isPayableEntry(entry)) {
      return null;
    }

    // Generate canonical content ID (collection/slug)
    const canonicalId = entryToContentId({
      collection,
      entryId: entry.id,
      entrySlug: entry.slug,
    });

    // Query Polar to get product ID by content_id metadata
    const productId = await findProductByContentId(canonicalId);

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
      body: entry.body ?? "",
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
    if (!shouldProcessUrl(url.pathname, includePatterns)) {
      return next();
    }

    // Check if current path is for payable content
    const contentInfo = await getContentInfoFromPath(url.pathname);

    // If not payable content, continue normally
    if (!contentInfo || !contentInfo.isPayable) {
      return next();
    }

    // Content is payable - check authentication and access
    let isAuthenticated = false;
    let hasAccess = false;

    // Check authentication
    if (config.isAuthenticated) {
      // Use custom auth check
      isAuthenticated = await config.isAuthenticated(context);
    } else {
      // Default: check MonaKiosk session cookies
      isAuthenticated = hasPolarSession(cookies);
    }

    // Check access (only if authenticated)
    if (isAuthenticated) {
      if (config.checkAccess) {
        // Use custom access check
        hasAccess = await config.checkAccess(context, contentInfo.contentId);
      } else {
        // Default: validate via Polar API
        const customerToken = cookies.get(COOKIE_NAMES.SESSION)?.value;
        const customerId = cookies.get(COOKIE_NAMES.CUSTOMER_ID)?.value;

        if (customerToken && customerId) {
          hasAccess = await validateCustomerAccess(customerToken, {
            customerId: customerId,
            contentId: contentInfo.contentId,
          });
        }
      }
    }

    // Only generate preview if user doesn't have access
    let preview: string | undefined;
    if (!hasAccess) {
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
    const interval =
      "interval" in contentInfo.entry.data
        ? contentInfo.entry.data.interval
        : undefined;

    const hasDownloads = !!(
      contentInfo.entry.data.downloads &&
      contentInfo.entry.data.downloads.length > 0
    );
    const downloadCount = contentInfo.entry.data.downloads?.length || 0;

    // Fetch downloadable files if user has access
    let downloadableFiles: DownloadableFile[] | undefined;
    let downloadableSection: string | undefined;

    if (hasAccess && hasDownloads) {
      const customerToken = cookies.get(COOKIE_NAMES.SESSION)?.value;
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
      price: contentInfo.entry.data.price,
      currency: contentInfo.entry.data.currency,
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
