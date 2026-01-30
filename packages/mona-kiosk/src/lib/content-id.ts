import { relative } from "node:path";
import GithubSlugger from "github-slugger";

function normaliseSlug(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

function slugifyPath(path: string): string {
  const slugger = new GithubSlugger();
  const withoutExt = path.replace(/\.(md|mdx)$/i, "");
  const segments = withoutExt.split("/").filter(Boolean);

  if (segments.length === 0) {
    return "";
  }

  const slugSegments = segments.map((segment) => slugger.slug(segment));
  const slug = slugSegments.join("/").replace(/\/index$/, "");
  return slug;
}

function buildCanonicalContentId(params: {
  collection: string;
  slug: string;
}): string {
  const { collection, slug } = params;
  const normalisedSlug = normaliseSlug(slug);
  return `${collection}/${normalisedSlug}`;
}

function resolveRelativePath(params: {
  normalized: string;
  collection: string;
}): string {
  const { normalized, collection } = params;
  const cleaned = normalized.replace(/^\//, "");
  const segments = cleaned.split("/").filter((segment) => segment.length > 0);
  const collectionIndex = segments.lastIndexOf(collection);

  if (collectionIndex >= 0) {
    const relativeSegments = segments.slice(collectionIndex + 1);
    return relativeSegments.join("/");
  }

  return cleaned;
}

function resolveSlugFromPath(params: {
  relativePath: string;
  frontmatterSlug?: unknown;
}): string {
  const { relativePath, frontmatterSlug } = params;
  if (typeof frontmatterSlug === "string" && frontmatterSlug.trim()) {
    return frontmatterSlug.trim();
  }

  return slugifyPath(relativePath);
}

/**
 * Convert file path to canonical content ID in the form `${collection}/${slug}`.
 */
export function pathToContentId(params: {
  filePath: string;
  collection: string;
  cwd?: string;
  frontmatterSlug?: unknown;
}): string {
  const { filePath, collection, cwd = process.cwd(), frontmatterSlug } = params;
  const normalized = relative(cwd, filePath)
    .replace(/\\/g, "/")
    .replace(/^src\/content\//, "");
  const relativePath = resolveRelativePath({
    normalized,
    collection,
  });

  const slug = resolveSlugFromPath({
    relativePath,
    frontmatterSlug,
  });

  return buildCanonicalContentId({ collection, slug });
}

/**
 * Convert entry identifier (collection-relative) to canonical content ID.
 */
export function entryToContentId(params: {
  collection: string;
  entryId: string;
  entrySlug?: string;
}): string {
  const { collection, entryId, entrySlug } = params;
  const slugCandidate =
    typeof entrySlug === "string" && entrySlug.trim()
      ? entrySlug
      : entryId.replace(/^\//, "");

  return buildCanonicalContentId({
    collection,
    slug: slugCandidate,
  });
}

/**
 * Generate candidate identifiers for a content ID to help with loose matching.
 */
export function generateContentIdCandidates(contentId: string): string[] {
  const normalized = contentId.replace(/\\/g, "/");
  const withoutExt = normalized.replace(/\.(md|mdx)$/i, "");

  const candidates = new Set<string>([normalized, withoutExt]);

  if (withoutExt.includes("/")) {
    const [, ...segments] = withoutExt.split("/");
    if (segments.length > 0) {
      candidates.add(segments.join("/"));
    }
  }

  const lastSegment = withoutExt.split("/").pop();
  if (lastSegment) {
    candidates.add(lastSegment);
  }

  return Array.from(candidates);
}

export function buildIndexIdCandidates(params: {
  localePath: string | null;
  slug: string;
  groupIndex: string;
}): string[] {
  const { localePath, slug, groupIndex } = params;
  const indexSlug = `${slug}/${groupIndex}`;
  if (!localePath) {
    return [indexSlug];
  }
  return [`${localePath}/${indexSlug}`, indexSlug];
}
