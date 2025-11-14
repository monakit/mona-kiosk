import { Polar } from "@polar-sh/sdk";
import type { Benefit } from "@polar-sh/sdk/models/components/benefit";
import type { ExistingProductPrice } from "@polar-sh/sdk/models/components/existingproductprice";
import type { Product } from "@polar-sh/sdk/models/components/product";
import type { ProductPriceFixedCreate } from "@polar-sh/sdk/models/components/productpricefixedcreate";
import type { BenefitsListRequest } from "@polar-sh/sdk/models/operations/benefitslist.js";
import type { ProductsListRequest } from "@polar-sh/sdk/models/operations/productslist.js";
import { POLAR_API_PAGE_SIZE } from "../constants";
import { getGlobalConfig } from "../integration/config";
import { generateContentIdCandidates } from "./content-id";
import {
  findByMetadataCandidates,
  normaliseMetadataValue,
} from "./polar-finder";

let polarClientInstance: Polar | null = null;
let polarClientProxy: Polar | null = null;
const productMapping = new Map<string, string>();
const productToContentMapping = new Map<string, string>();
const customBenefitCache = new Map<string, string>();
const downloadablesBenefitCache = new Map<string, string>();

function assertBenefitType(
  benefit: Benefit,
  expectedType: Benefit["type"],
  context: { contentId: string; benefitPurpose: string },
) {
  if (benefit.type !== expectedType) {
    throw new Error(
      `  ✗ Found benefit "${benefit.id}" for content "${context.contentId}" but it is type "${benefit.type}". ` +
        `MonaKiosk needs a "${expectedType}" benefit for ${context.benefitPurpose}. ` +
        `Delete or rename the existing benefit in Polar and rerun the sync.`,
    );
  }
}

/**
 * Initialize the Polar client instance (internal use only)
 */
function initializePolarClient(): Polar {
  if (polarClientInstance) {
    return polarClientInstance;
  }

  const config = getGlobalConfig();
  polarClientInstance = new Polar({
    accessToken: config.polar.accessToken,
    server: config.polar.server,
  });

  return polarClientInstance;
}

/**
 * Get Polar client instance
 * Returns a lazy proxy that only initializes when first used
 * This allows getPolarClient() to be called before monaKiosk config is initialized
 */
export function getPolarClient(): Polar {
  if (polarClientProxy) {
    return polarClientProxy;
  }

  // Create a proxy that defers initialization until first method call
  polarClientProxy = new Proxy({} as Polar, {
    get(_target, prop) {
      const client = initializePolarClient();
      const value = client[prop as keyof Polar];

      // Bind methods to the client instance
      if (typeof value === "function") {
        return value.bind(client);
      }

      return value;
    },
  });

  return polarClientProxy;
}

export function setProductMapping(
  contentId: string,
  productId: string,
  options?: { canonical?: boolean },
) {
  const normalised = contentId.replace(/\\/g, "/");
  productMapping.set(normalised, productId);

  if (options?.canonical || !productToContentMapping.has(productId)) {
    productToContentMapping.set(productId, normalised);
  }
}

export function getProductIdForContent(contentId: string): string | undefined {
  for (const candidate of generateContentIdCandidates(contentId)) {
    const productId = productMapping.get(candidate);
    if (productId) {
      return productId;
    }
  }

  return undefined;
}

export function getContentIdForProduct(productId: string): string | undefined {
  return productToContentMapping.get(productId);
}

export function getAllProductMappings(): Map<string, string> {
  return productMapping;
}

export function cacheProductMappings(params: {
  canonicalId: string;
  productId: string;
  additionalCandidates?: Iterable<string>;
}) {
  const { canonicalId, productId, additionalCandidates } = params;
  setProductMapping(canonicalId, productId, { canonical: true });

  const candidates = new Set(generateContentIdCandidates(canonicalId));
  if (additionalCandidates) {
    for (const candidate of additionalCandidates) {
      candidates.add(candidate.replace(/\\/g, "/"));
    }
  }

  candidates.delete(canonicalId);

  for (const candidate of candidates) {
    setProductMapping(candidate, productId);
  }
}

function normaliseTimestamp(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function needsPriceUpdate(
  existingProduct: Product | undefined,
  price: number,
  currency: string,
): boolean {
  const prices = existingProduct?.prices ?? [];
  const normalisedCurrency = currency.toLowerCase();

  const existingPrice = prices.find((item) => item.amountType === "fixed");

  // No existing price found, needs update
  if (!existingPrice || !("priceAmount" in existingPrice)) {
    return true;
  }

  // Check if price or currency changed
  const priceChanged = existingPrice.priceAmount !== price;
  const currencyChanged =
    existingPrice.priceCurrency?.toLowerCase() !== normalisedCurrency;

  return priceChanged || currencyChanged;
}

async function findExistingProduct(
  contentIds: string[],
  organizationId: string,
): Promise<Product | undefined> {
  const polar = getPolarClient();
  const product = await findByMetadataCandidates({
    list: (args: ProductsListRequest) => polar.products.list(args),
    buildArgs: (candidate) => ({
      organizationId,
      metadata: { content_id: candidate },
      limit: POLAR_API_PAGE_SIZE,
    }),
    candidates: contentIds,
    getMetadataValue: (item) => item.metadata?.content_id,
    normalise: normaliseMetadataValue,
  });

  return product ?? undefined;
}

/**
 * Find product by content ID from Polar (runtime lookup)
 * This queries Polar API to find the product, useful when in-memory mapping isn't available
 */
export async function findProductByContentId(
  contentId: string,
): Promise<string | null> {
  // First check in-memory mapping
  const cached = getProductIdForContent(contentId);
  if (cached) {
    return cached;
  }

  // Query Polar API
  const config = getGlobalConfig();
  const candidates = generateContentIdCandidates(contentId);
  const product = await findExistingProduct(
    candidates,
    config.polar.organizationId,
  );

  if (!product) {
    return null;
  }

  const metadataContentId =
    normaliseMetadataValue(product.metadata?.content_id) ?? contentId;

  cacheProductMappings({
    canonicalId: metadataContentId,
    productId: product.id,
    additionalCandidates: candidates,
  });

  return product.id;
}

function createFixedPrice(
  price: number,
  currency: string,
): ProductPriceFixedCreate[] {
  return [
    {
      amountType: "fixed",
      priceAmount: price,
      priceCurrency: currency.toLowerCase(),
    },
  ];
}

function buildFixedPricePayload(
  existingProduct: Product | undefined,
  price: number,
  currency: string,
): (ExistingProductPrice | ProductPriceFixedCreate)[] {
  const normalisedCurrency = currency.toLowerCase();
  const prices = existingProduct?.prices ?? [];

  // Find existing fixed price
  const existingPrice = prices.find((item) => item.amountType === "fixed");

  if (!existingPrice) {
    return createFixedPrice(price, currency);
  }

  // Type guard: check if this is a fixed price type with priceAmount and priceCurrency
  if (
    !("priceAmount" in existingPrice) ||
    !("priceCurrency" in existingPrice)
  ) {
    return createFixedPrice(price, currency);
  }

  // Check if existing price matches current values
  const priceMatches = existingPrice.priceAmount === price;
  const currencyMatches =
    existingPrice.priceCurrency?.toLowerCase() === normalisedCurrency;

  if (priceMatches && currencyMatches) {
    return [{ id: existingPrice.id }];
  }

  return createFixedPrice(price, currency);
}

/**
 * Create or update custom benefit with description + URL in private note
 * This benefit provides customers with access information and content URL
 */
async function ensureCustomBenefitForContent(params: {
  contentId: string;
  collection: string;
  organizationId: string;
  title: string;
  description: string;
  contentUrl: string;
}): Promise<string> {
  const { contentId, organizationId, description, contentUrl } = params;

  const desiredMetadata = {
    content_id: params.contentId,
    collection: params.collection,
    title: params.title,
  };
  const benefitDescription = params.title.substring(0, 42);
  const privateNote = `${description}\n\nAccess your content here: ${contentUrl}`;

  const cached = customBenefitCache.get(contentId);
  if (cached) {
    return cached;
  }

  const polar = getPolarClient();
  // Note: We search without type filter first, then verify type
  // This is because Polar API may not properly filter by type when metadata is specified
  const candidateBenefit = await findByMetadataCandidates({
    list: (args: BenefitsListRequest) => polar.benefits.list(args),
    buildArgs: (candidate) => ({
      organizationId,
      metadata: { content_id: candidate },
      limit: POLAR_API_PAGE_SIZE,
    }),
    candidates: generateContentIdCandidates(contentId),
    getMetadataValue: (item: Benefit) => item.metadata?.content_id,
    normalise: normaliseMetadataValue,
    predicate: (item: Benefit) => item.type === "custom", // Filter by type client-side
  });

  const existingBenefit = candidateBenefit ?? null;

  if (existingBenefit) {
    assertBenefitType(existingBenefit, "custom", {
      contentId,
      benefitPurpose: "sharing gated content details",
    });

    const existingNote =
      (existingBenefit.properties as { note?: string })?.note ?? "";
    const metadataChanged = !metadataMatches(
      existingBenefit.metadata ?? undefined,
      desiredMetadata,
    );
    const noteChanged = existingNote !== privateNote;
    const descriptionChanged =
      (existingBenefit.description ?? "") !== benefitDescription;

    if (metadataChanged || noteChanged || descriptionChanged) {
      await polar.benefits.update({
        id: existingBenefit.id,
        requestBody: {
          type: "custom",
          description: benefitDescription,
          metadata: desiredMetadata,
          properties: {
            note: privateNote,
          },
        },
      });
    }

    customBenefitCache.set(contentId, existingBenefit.id);
    return existingBenefit.id;
  }

  const created = await polar.benefits.create({
    type: "custom",
    description: benefitDescription, // Max 42 chars
    metadata: desiredMetadata,
    properties: {
      note: privateNote,
    },
  });

  customBenefitCache.set(contentId, created.id);
  return created.id;
}

/**
 * Update downloadables benefit files/metadata if they have changed
 */
async function updateDownloadablesBenefitIfNeeded(
  benefit: Benefit,
  params: {
    fileIds: string[];
    metadata: Record<string, string>;
    description: string;
  },
): Promise<void> {
  const existingFiles =
    (benefit.properties as { files?: string[] })?.files || [];
  const fileSet = new Set(existingFiles);
  const filesChanged =
    existingFiles.length !== params.fileIds.length ||
    params.fileIds.some((id) => !fileSet.has(id));

  const metadataChanged = !metadataMatches(
    benefit.metadata ?? undefined,
    params.metadata,
  );
  const descriptionChanged = (benefit.description ?? "") !== params.description;

  if (filesChanged || metadataChanged || descriptionChanged) {
    const polar = getPolarClient();
    await polar.benefits.update({
      id: benefit.id,
      requestBody: {
        type: "downloadables",
        description: params.description,
        metadata: params.metadata,
        properties: {
          files: params.fileIds,
        },
      },
    });
  }
}

function formatDownloadablesDescription(title: string): string {
  return `Files for ${title}`.substring(0, 42);
}

function metadataMatches(
  metadata: Record<string, unknown> | undefined,
  expected: Record<string, string>,
): boolean {
  const current = metadata ?? {};
  return Object.entries(expected).every(([key, value]) => {
    return normaliseMetadataValue(current[key]) === value;
  });
}

/**
 * Create or update downloadables benefit with uploaded files
 * This benefit provides customers with downloadable files
 */
async function ensureDownloadablesBenefitForContent(params: {
  contentId: string;
  collection: string;
  organizationId: string;
  title: string;
  fileIds: string[];
}): Promise<string> {
  const { contentId, organizationId, fileIds } = params;
  const polar = getPolarClient();
  const metadata = {
    content_id: params.contentId,
    collection: params.collection,
    title: params.title,
  };
  const benefitDescription = formatDownloadablesDescription(params.title);

  const cached = downloadablesBenefitCache.get(contentId);
  if (cached) {
    const cachedBenefit = await polar.benefits.get({ id: cached });
    assertBenefitType(cachedBenefit, "downloadables", {
      contentId,
      benefitPurpose: "serving downloadable files",
    });
    await updateDownloadablesBenefitIfNeeded(cachedBenefit, {
      fileIds,
      metadata,
      description: benefitDescription,
    });
    return cached;
  }

  // Try to find existing downloadables benefit
  // Note: We search without type filter first, then verify type
  // This is because Polar API may not properly filter by type when metadata is specified
  const candidateBenefit = await findByMetadataCandidates({
    list: (args: BenefitsListRequest) => polar.benefits.list(args),
    buildArgs: (candidate) => ({
      organizationId,
      metadata: { content_id: candidate },
      limit: POLAR_API_PAGE_SIZE,
    }),
    candidates: generateContentIdCandidates(contentId),
    getMetadataValue: (item: Benefit) => item.metadata?.content_id,
    normalise: normaliseMetadataValue,
    predicate: (item: Benefit) => item.type === "downloadables", // Filter by type client-side
  });

  const existingBenefit = candidateBenefit ?? null;

  if (existingBenefit) {
    assertBenefitType(existingBenefit, "downloadables", {
      contentId,
      benefitPurpose: "serving downloadable files",
    });
    downloadablesBenefitCache.set(contentId, existingBenefit.id);
    await updateDownloadablesBenefitIfNeeded(existingBenefit, {
      fileIds,
      metadata,
      description: benefitDescription,
    });
    return existingBenefit.id;
  }

  // Create new downloadables benefit
  const created = await polar.benefits.create({
    type: "downloadables",
    description: benefitDescription,
    metadata,
    properties: {
      files: fileIds,
    },
  });

  downloadablesBenefitCache.set(contentId, created.id);
  return created.id;
}

function shouldUpdateProduct(
  existingProduct: Product,
  data: {
    contentId: string;
    collection: string;
    updatedAt: number;
    name: string;
    description: string;
    price: number;
    currency: string;
    interval?: string;
  },
): boolean {
  const existingMetadata =
    (existingProduct.metadata as Record<string, unknown> | undefined) ??
    undefined;

  const metadataMatches =
    normaliseMetadataValue(existingMetadata?.content_id) === data.contentId &&
    normaliseMetadataValue(existingMetadata?.collection) === data.collection &&
    normaliseTimestamp(existingMetadata?.updatedAt) === data.updatedAt;

  const nameMatches = existingProduct.name === data.name;
  const descriptionMatches =
    (existingProduct.description ?? "") === data.description;
  const priceMatches = !needsPriceUpdate(
    existingProduct,
    data.price,
    data.currency,
  );

  return !(
    metadataMatches &&
    nameMatches &&
    descriptionMatches &&
    priceMatches
  );
}

async function createProduct(
  data: {
    name: string;
    description: string;
    price: number;
    currency: string;
    interval?: "month" | "year" | "week" | "day";
  },
  metadata: Record<string, string | number>,
): Promise<Product> {
  const polar = getPolarClient();
  const productType = data.interval ? "subscription" : "one-time";
  console.log(`  Creating ${productType} product - ${data.name} ...`);

  return polar.products.create({
    name: data.name,
    description: data.description,
    metadata,
    prices: createFixedPrice(data.price, data.currency),
    ...(data.interval && { recurringInterval: data.interval }),
  });
}

async function updateProduct(
  existingProduct: Product,
  data: {
    name: string;
    description: string;
    price: number;
    currency: string;
    interval?: "month" | "year" | "week" | "day";
  },
  metadata: Record<string, string | number>,
): Promise<Product> {
  const polar = getPolarClient();
  const productType = data.interval ? "subscription" : "one-time";
  console.log(
    `  Updating ${productType} product - ${existingProduct.name} ...`,
  );

  return polar.products.update({
    id: existingProduct.id,
    productUpdate: {
      name: data.name,
      description: data.description,
      metadata,
      prices: buildFixedPricePayload(
        existingProduct,
        data.price,
        data.currency,
      ),
    },
  });
}

async function syncProductBenefits(
  product: Product,
  benefitIds: string[],
): Promise<Product> {
  const benefits = product.benefits ?? [];
  const existingBenefitIds = new Set(benefits.map((benefit) => benefit.id));
  const newBenefitIds = new Set(benefitIds);

  // Check if benefits changed (added or removed)
  const benefitsChanged =
    existingBenefitIds.size !== newBenefitIds.size ||
    !Array.from(newBenefitIds).every((id) => existingBenefitIds.has(id));

  if (benefitsChanged) {
    const polar = getPolarClient();
    return polar.products.updateBenefits({
      id: product.id,
      productBenefitsUpdate: {
        benefits: benefitIds, // Use ONLY the new benefit IDs (replaces existing)
      },
    });
  }

  return product;
}

export async function upsertProduct(data: {
  name: string;
  description: string;
  price: number;
  currency: string;
  interval?: "month" | "year" | "week" | "day";
  contentId: string;
  collection: string;
  updatedAt: number;
  contentUrl: string;
  fileIds?: string[];
  hasDownloads?: boolean;
}): Promise<Product> {
  const organizationId = getGlobalConfig().polar.organizationId;
  const existing = await findExistingProduct(
    generateContentIdCandidates(data.contentId),
    organizationId,
  );

  // Build metadata with pricing model
  const pricingModel = data.interval ? "subscription" : "one_time";
  const metadata: Record<string, string | number> = {
    content_id: data.contentId,
    collection: data.collection,
    updatedAt: data.updatedAt,
    pricing_model: pricingModel,
  };

  // Add interval to metadata for subscriptions
  if (data.interval) {
    metadata.interval = data.interval;
  }

  let product: Product;

  if (!existing) {
    product = await createProduct(data, metadata);
  } else {
    if (existing.isArchived) {
      throw new Error(
        `  ✗ ${existing.name} is archived, remove its price or unarchive it in Polar.sh dashboard.`,
      );
    }

    // Guard: Recurring interval cannot be changed once set
    if (
      existing.recurringInterval &&
      data.interval &&
      existing.recurringInterval !== data.interval
    ) {
      throw new Error(
        `  ✗ ${existing.name} recurring interval cannot be changed from "${existing.recurringInterval}" to "${data.interval}".`,
      );
    }

    if (shouldUpdateProduct(existing, data)) {
      product = await updateProduct(existing, data, metadata);
    } else {
      console.log(`  🚫 No updates needed for product - ${existing.name}.`);
      product = existing;
    }
  }

  // Create custom benefit (always)
  const customBenefitId = await ensureCustomBenefitForContent({
    contentId: data.contentId,
    collection: data.collection,
    organizationId,
    title: data.name,
    description: data.description,
    contentUrl: data.contentUrl,
  });

  // Create downloadables benefit (if files exist)
  const benefitIds = [customBenefitId];
  if (data.hasDownloads && data.fileIds && data.fileIds.length > 0) {
    const downloadablesBenefitId = await ensureDownloadablesBenefitForContent({
      contentId: data.contentId,
      collection: data.collection,
      organizationId,
      title: data.name,
      fileIds: data.fileIds,
    });
    benefitIds.push(downloadablesBenefitId);
  }

  return syncProductBenefits(product, benefitIds);
}
