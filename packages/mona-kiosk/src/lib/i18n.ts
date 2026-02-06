import type { AstroConfig } from "astro";

type AstroI18n = NonNullable<AstroConfig["i18n"]>;

type LocalePathConfig = {
  path: string;
  codes: [string, ...string[]];
};

type Locales = AstroI18n["locales"];

export type ResolvedI18nConfig = {
  localePaths: string[];
  defaultLocalePath: string;
  prefixDefaultLocale: boolean;
};

function isLocalePathConfig(value: Locales[number]): value is LocalePathConfig {
  return typeof value === "object" && value !== null;
}

function getLocalePaths(locales: Locales): string[] {
  return locales.map((locale) =>
    isLocalePathConfig(locale) ? locale.path : locale,
  );
}

function getDefaultLocalePath(locales: Locales, defaultLocale: string): string {
  for (const locale of locales) {
    if (isLocalePathConfig(locale)) {
      if (locale.codes.includes(defaultLocale)) {
        return locale.path;
      }
      continue;
    }

    if (locale === defaultLocale) {
      return locale;
    }
  }

  return defaultLocale;
}

export function resolveI18nConfig(
  astroI18n?: AstroI18n,
): ResolvedI18nConfig | null {
  if (!astroI18n) return null;

  const { locales, defaultLocale, routing } = astroI18n;
  const localePaths = getLocalePaths(locales);

  if (localePaths.length === 0) return null;

  const defaultLocalePath = getDefaultLocalePath(locales, defaultLocale);

  const prefixDefaultLocale =
    typeof routing === "object" && routing !== null
      ? (routing.prefixDefaultLocale ?? false)
      : false;

  return {
    localePaths,
    defaultLocalePath,
    prefixDefaultLocale,
  };
}

export interface UrlPatternInput {
  include: string;
  group?: { index: string };
}

export function includePatternToUrlPattern(includePattern: string): string {
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
 * Strip the last /* segment from a URL pattern.
 * e.g., "/courses/**\/*" -> "/courses/**"
 */
function stripLastWildcardSegment(pattern: string): string | null {
  const lastSlash = pattern.lastIndexOf("/");
  if (lastSlash <= 0) return null;
  return pattern.slice(0, lastSlash);
}

export function buildUrlPatterns(
  inputs: UrlPatternInput[],
  i18n?: ResolvedI18nConfig | null,
): string[] {
  const basePatterns: string[] = [];

  for (const input of inputs) {
    const pattern = includePatternToUrlPattern(input.include);
    basePatterns.push(pattern);

    // For group configs, also emit a pattern with the last /* segment removed
    // so stripped index URLs like /courses/git-essentials match
    if (input.group) {
      const stripped = stripLastWildcardSegment(pattern);
      if (stripped) {
        basePatterns.push(stripped);
      }
    }
  }

  if (!i18n) {
    return basePatterns;
  }

  const patterns = new Set<string>();

  for (const localePath of i18n.localePaths) {
    for (const pattern of basePatterns) {
      patterns.add(`/${localePath}${pattern}`);
    }
  }

  if (!i18n.prefixDefaultLocale) {
    for (const pattern of basePatterns) {
      patterns.add(pattern);
    }
  }

  return Array.from(patterns);
}

export function parsePathname(
  pathname: string,
  i18n?: ResolvedI18nConfig | null,
): {
  localePath: string | null;
  collection: string;
  slug: string;
} | null {
  const trimmed = pathname.replace(/^\/+|\/+$/g, "");
  if (!trimmed) {
    return null;
  }

  const segments = trimmed.split("/").filter(Boolean);
  if (segments.length < 2) {
    return null;
  }

  if (i18n) {
    const maybeLocale = segments[0];
    if (i18n.localePaths.includes(maybeLocale)) {
      if (segments.length < 3) {
        return null;
      }
      return {
        localePath: maybeLocale,
        collection: segments[1],
        slug: segments.slice(2).join("/"),
      };
    }

    if (!i18n.prefixDefaultLocale) {
      return {
        localePath: i18n.defaultLocalePath,
        collection: segments[0],
        slug: segments.slice(1).join("/"),
      };
    }

    return null;
  }

  return {
    localePath: null,
    collection: segments[0],
    slug: segments.slice(1).join("/"),
  };
}

export function stripLocalePrefix(
  pathname: string,
  localePath: string | null,
): string {
  if (!localePath) return pathname;
  const prefix = `/${localePath}`;
  if (pathname === prefix) return "/";
  if (pathname.startsWith(`${prefix}/`)) {
    return pathname.slice(prefix.length) || "/";
  }
  return pathname;
}

export function buildContentUrl(params: {
  siteUrl: string;
  canonicalId: string;
  i18n?: ResolvedI18nConfig | null;
}): string {
  const { siteUrl, canonicalId, i18n } = params;
  if (!i18n) {
    return `${siteUrl}/${canonicalId}`;
  }

  const [collection, maybeLocale, ...rest] = canonicalId.split("/");
  if (!collection || !maybeLocale) {
    return `${siteUrl}/${canonicalId}`;
  }

  const localePath = maybeLocale;
  const slug = rest.join("/");

  if (!i18n.localePaths.includes(localePath)) {
    return `${siteUrl}/${canonicalId}`;
  }

  const prefix =
    i18n.prefixDefaultLocale || localePath !== i18n.defaultLocalePath
      ? `/${localePath}`
      : "";

  return `${siteUrl}${prefix}/${collection}/${slug}`;
}
