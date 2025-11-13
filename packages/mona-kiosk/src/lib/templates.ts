import { ROUTES } from "../constants";
import type { PayableEntry } from "../schemas/payable";
import { renderErrorHtml } from "./error-renderer";

// Constants for preview truncation
const DEFAULT_PREVIEW_PARAGRAPHS = 3;
const DEFAULT_PREVIEW_SLIDES = 3;

// UI text constants
const MESSAGE_NO_ACCESS = "You don't have access to this content yet.";
const MESSAGE_ALREADY_PURCHASED = "Already purchased?";
const BUTTON_PURCHASE_ACCESS = "Purchase Access";
const LINK_SIGNIN = "Sign in to access";
const FALLBACK_TITLE = "Premium Content";
const FALLBACK_DESCRIPTION = "This content requires payment to access.";

/**
 * Template context with variables available for substitution
 */
export interface TemplateContext {
  contentId: string;
  collection: string;
  title: string;
  description: string;
  price: number;
  formattedPrice: string;
  currency: string;
  checkoutUrl: string;
  preview: string;
  isAuthenticated: boolean;
  signinSection: string;
  signinPagePath: string;
  isSubscription: boolean;
  interval?: string;
  billingCycle?: string;
  hasDownloads: boolean;
  downloadCount: number;
  downloadInfo: string;
}

/**
 * Preview handler function type
 */
export type PreviewHandler = (
  entry: PayableEntry,
) => Promise<string | null> | string | null;

/**
 * Truncate HTML content by paragraphs and block elements
 */
function truncateContentByParagraphs(
  html: string,
  maxParagraphs = 3,
): string | null {
  const cleaned = html.replace(/<script[\s\S]*?<\/script>/gi, "").trim();
  if (!cleaned) {
    return null;
  }

  // Match common block-level elements including tables, headings, lists, paragraphs, and divs
  const blockElements = cleaned.match(
    /<(?:p|div|h[1-6]|table|ul|ol|blockquote|pre)\b[^>]*>[\s\S]*?<\/(?:p|div|h[1-6]|table|ul|ol|blockquote|pre)>/gi,
  );

  if (!blockElements || blockElements.length === 0) {
    return cleaned;
  }

  const count = Math.max(1, Math.trunc(maxParagraphs));
  const truncated = blockElements.slice(0, count).join("\n");
  const needsEllipsis = blockElements.length > count;
  return needsEllipsis ? `${truncated}\n<p>…</p>` : truncated;
}

/**
 * Default preview handler for regular content (paragraphs)
 */
export const defaultContentPreviewHandler: PreviewHandler = async (entry) => {
  if (entry.rendered?.html) {
    return truncateContentByParagraphs(
      entry.rendered.html,
      DEFAULT_PREVIEW_PARAGRAPHS,
    );
  }

  return null;
};

/**
 * Default preview handler for slides (first N slides)
 */
export const defaultSlidesPreviewHandler: PreviewHandler = (entry) => {
  const markdown = entry.body;
  const segments = markdown.split(/\n---\n/g);
  if (segments.length <= 1) {
    return markdown; // No slides detected, return as-is
  }
  return segments.slice(0, DEFAULT_PREVIEW_SLIDES).join("\n---\n");
};

/**
 * Auto-detect content type and return appropriate preview handler
 */
export function getDefaultPreviewHandler(markdown: string): PreviewHandler {
  // Detect slides-style content (Reveal.js sections)
  // Slides typically have multiple --- separators AND minimal content between them
  const slideSeparators = markdown.match(/\n---\n/g);
  if (slideSeparators && slideSeparators.length >= 3) {
    // Additional check: slides usually have shorter sections
    const segments = markdown.split(/\n---\n/);
    const avgLength =
      segments.reduce((sum, seg) => sum + seg.length, 0) / segments.length;
    // If average segment is less than 500 chars, likely slides
    if (avgLength < 500) {
      return defaultSlidesPreviewHandler;
    }
  }
  return defaultContentPreviewHandler;
}

// CSS styles for the paywall component
const PAYWALL_STYLES = `<style>
  .mona-kiosk-paywall {
    background: #f5f6ff;
    border-radius: 16px;
    padding: 2rem;
    margin: 2rem 0;
    text-align: center;
  }
  .mona-kiosk-paywall h2 {
    font-size: 1.8rem;
    margin-bottom: 1rem;
    color: #1f2933;
  }
  .mona-kiosk-paywall p {
    margin-bottom: 1.5rem;
    color: #475467;
    line-height: 1.6;
  }
  .mona-kiosk-price {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 1.5rem;
    color: #1f2933;
  }
  .mona-kiosk-actions {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: center;
  }
  .mona-kiosk-checkout-btn {
    display: inline-block;
    padding: 0.85rem 2rem;
    border-radius: 999px;
    background: #1f2933;
    color: #fff;
    font-weight: 600;
    text-decoration: none;
    transition: background 0.2s;
  }
  .mona-kiosk-checkout-btn:hover {
    background: #2d3748;
  }
  .mona-kiosk-divider {
    display: flex;
    align-items: center;
    width: 100%;
    margin: 0.5rem 0;
  }
  .mona-kiosk-divider::before,
  .mona-kiosk-divider::after {
    content: "";
    flex: 1;
    border-bottom: 1px solid #d1d5db;
  }
  .mona-kiosk-divider span {
    padding: 0 1rem;
    color: #6b7280;
    font-size: 0.875rem;
  }
  .mona-kiosk-signin-link {
    color: #667eea;
    text-decoration: none;
    font-weight: 500;
    font-size: 0.9rem;
    transition: color 0.2s;
  }
  .mona-kiosk-signin-link:hover {
    color: #5568d3;
    text-decoration: underline;
  }
  .mona-kiosk-downloads-info {
    background: #e0e7ff;
    border-radius: 8px;
    padding: 0.75rem 1rem;
    margin-bottom: 1rem;
  }
  .mona-kiosk-downloads-info p {
    margin: 0;
    color: #3730a3;
    font-size: 0.95rem;
  }
  @media (prefers-color-scheme: dark) {
    .mona-kiosk-paywall {
      background: #2d3748;
    }
    .mona-kiosk-paywall h2,
    .mona-kiosk-price {
      color: #f7fafc;
    }
    .mona-kiosk-paywall p {
      color: #cbd5e0;
    }
    .mona-kiosk-divider::before,
    .mona-kiosk-divider::after {
      border-color: #4a5568;
    }
    .mona-kiosk-divider span {
      color: #a0aec0;
    }
    .mona-kiosk-signin-link {
      color: #818cf8;
    }
    .mona-kiosk-signin-link:hover {
      color: #a5b4fc;
    }
    .mona-kiosk-downloads-info {
      background: #4c51bf;
    }
    .mona-kiosk-downloads-info p {
      color: #e0e7ff;
    }
  }
</style>`;

/**
 * Default paywall template - generic template that works for most content types
 */
export function getDefaultPaywallTemplate(): string {
  return `{{preview}}

---

<div class="mona-kiosk-paywall">
  <h2>{{title}}</h2>
  <p>{{description}}</p>
  {{downloadInfo}}
  <div class="mona-kiosk-price">{{formattedPrice}}</div>
  <p>${MESSAGE_NO_ACCESS}</p>
  <div class="mona-kiosk-actions">
    <a href="{{checkoutUrl}}" class="mona-kiosk-checkout-btn">${BUTTON_PURCHASE_ACCESS}</a>
    {{signinSection}}
  </div>
</div>

${PAYWALL_STYLES}`;
}

/**
 * Format interval to human-readable billing cycle
 */
function formatInterval(interval: string): string {
  const map: Record<string, string> = {
    month: "month",
    year: "year",
    week: "week",
    day: "day",
  };
  return map[interval] || interval;
}

/**
 * Format price with proper currency symbol and formatting
 */
function formatPrice(
  price: number,
  currency: string,
  interval?: string,
): string {
  const amount = price / 100;
  let formattedAmount: string;

  try {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    });
    formattedAmount = formatter.format(amount);
  } catch {
    // Fallback to USD if currency code is invalid
    formattedAmount = `$${amount.toFixed(2)}`;
  }

  // Add billing cycle for subscriptions
  if (interval) {
    const cycle = formatInterval(interval);
    return `${formattedAmount}/${cycle}`;
  }

  return formattedAmount;
}

/**
 * Render template with context variables
 * Performs simple {{variable}} substitution
 */
export function renderTemplate(
  template: string,
  context: TemplateContext,
): string {
  try {
    let result = template;

    // Replace all {{variable}} placeholders
    for (const [key, value] of Object.entries(context)) {
      const placeholder = `{{${key}}}`;
      const replacement = value != null ? String(value) : "";
      result = result.replaceAll(placeholder, replacement);
    }

    return result;
  } catch (error) {
    return renderErrorHtml({
      title: "Template Rendering Error",
      error,
    });
  }
}

/**
 * Build template context from entry data
 */
export function buildTemplateContext(params: {
  contentId: string;
  collection: string;
  entry: PayableEntry;
  preview: string;
  isAuthenticated: boolean;
  signinPagePath: string;
}): TemplateContext {
  const {
    contentId,
    collection,
    entry,
    preview,
    isAuthenticated,
    signinPagePath,
  } = params;

  // Direct access to typed data
  const { price, currency = "usd", title, description } = entry.data;

  // Check if this is a subscription (has interval field)
  const interval = "interval" in entry.data ? entry.data.interval : undefined;
  const isSubscription = !!interval;

  const formattedPrice = formatPrice(price, currency, interval);
  const billingCycle = interval ? formatInterval(interval) : undefined;
  const checkoutUrl = `${ROUTES.CHECKOUT}?content=${encodeURIComponent(contentId)}`;

  // Only show signin section if user is not authenticated
  const signinSection = isAuthenticated
    ? ""
    : `
  <div class="mona-kiosk-divider">
    <span>${MESSAGE_ALREADY_PURCHASED}</span>
  </div>
  <a href="${signinPagePath}" class="mona-kiosk-signin-link">${LINK_SIGNIN}</a>
  `;

  // Check if content has downloads
  const hasDownloads = !!(
    entry.data.downloads && entry.data.downloads.length > 0
  );
  const downloadCount = entry.data.downloads?.length || 0;

  // Build download info HTML
  const downloadInfo = hasDownloads
    ? `<div class="mona-kiosk-downloads-info">
    <p><strong>✨ Includes ${downloadCount} downloadable file${downloadCount > 1 ? "s" : ""}</strong></p>
  </div>`
    : "";

  return {
    contentId,
    collection,
    title: title ?? FALLBACK_TITLE,
    description: description ?? FALLBACK_DESCRIPTION,
    price,
    formattedPrice,
    currency: currency.toUpperCase(),
    checkoutUrl,
    preview,
    isAuthenticated,
    signinSection,
    signinPagePath,
    isSubscription,
    interval,
    billingCycle,
    hasDownloads,
    downloadCount,
    downloadInfo,
  };
}

/**
 * Downloadable file info for template rendering
 */
export interface DownloadableFileInfo {
  id: string;
  name: string;
  size: number;
  sizeFormatted: string;
  mimeType: string;
  downloadUrl: string;
}

/**
 * Default downloadable template - floating panel with file list
 */
export function getDefaultDownloadableTemplate(): string {
  return `
<div class="mona-kiosk-downloadables-panel">
  <div class="mona-kiosk-downloadables-header">
    <h3>Downloadable Files</h3>
    <button class="mona-kiosk-downloadables-close" aria-label="Close" onclick="this.closest('.mona-kiosk-downloadables-panel').style.display='none'">×</button>
  </div>
  <div class="mona-kiosk-downloadables-body">
    {{fileList}}
  </div>
</div>

<style>
.mona-kiosk-downloadables-panel {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 320px;
  max-width: calc(100vw - 40px);
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  font-family: system-ui, -apple-system, sans-serif;
}

.mona-kiosk-downloadables-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.mona-kiosk-downloadables-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.mona-kiosk-downloadables-close {
  background: none;
  border: none;
  font-size: 24px;
  line-height: 1;
  color: #6b7280;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s, color 0.2s;
}

.mona-kiosk-downloadables-close:hover {
  background-color: #f3f4f6;
  color: #111827;
}

.mona-kiosk-downloadables-body {
  padding: 12px;
  max-height: 400px;
  overflow-y: auto;
}

.mona-kiosk-download-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  margin-bottom: 8px;
  text-decoration: none;
  transition: background-color 0.2s, border-color 0.2s;
}

.mona-kiosk-download-item:last-child {
  margin-bottom: 0;
}

.mona-kiosk-download-item:hover {
  background-color: #f9fafb;
  border-color: #d1d5db;
}

.mona-kiosk-download-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  background-color: #3b82f6;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.mona-kiosk-download-icon svg {
  width: 20px;
  height: 20px;
  fill: white;
}

.mona-kiosk-download-info {
  flex: 1;
  min-width: 0;
}

.mona-kiosk-download-name {
  font-size: 14px;
  font-weight: 500;
  color: #111827;
  margin: 0 0 4px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mona-kiosk-download-size {
  font-size: 12px;
  color: #6b7280;
  margin: 0;
}
</style>
`;
}

/**
 * Render downloadable section with files
 */
export function renderDownloadableSection(params: {
  files: DownloadableFileInfo[];
  template?: string;
}): string {
  const { files, template } = params;

  if (files.length === 0) {
    return "";
  }

  // Render each file as a download link
  const fileListHtml = files
    .map(
      (file) => `
<a href="${file.downloadUrl}" class="mona-kiosk-download-item" download="${file.name}">
  <div class="mona-kiosk-download-icon">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
    </svg>
  </div>
  <div class="mona-kiosk-download-info">
    <p class="mona-kiosk-download-name">${file.name}</p>
    <p class="mona-kiosk-download-size">${file.sizeFormatted}</p>
  </div>
</a>
`,
    )
    .join("");

  // Use custom template or default
  const templateHtml = template ?? getDefaultDownloadableTemplate();

  // Replace {{fileList}} with rendered files
  return templateHtml.replace("{{fileList}}", fileListHtml);
}
