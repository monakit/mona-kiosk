import { readFile, stat } from "node:fs/promises";
import matter from "gray-matter";
import { glob } from "tinyglobby";
import type { ResolvedMonaKioskConfig } from "../integration/config";
import { pathToContentId } from "./content-id";
import { cacheProductMappings, upsertProduct } from "./polar-client";
import { getCachedFileIds, readStateFile } from "./state-manager";

/**
 * Payable frontmatter data from markdown files
 * Supports both one-time purchases and subscriptions
 * - One-time purchase: price and currency (no interval)
 * - Subscription: price, currency, and interval
 */
interface PayableData {
  price: number;
  currency?: string;
  interval?: "month" | "year" | "week" | "day";
  title?: string;
  description?: string;
  slug?: string;
  downloads?: Array<{
    title: string;
    file: string;
    description?: string;
  }>;
}

function isSubscriptionData(data: PayableData): boolean {
  return "interval" in data && !!data.interval;
}

/**
 * Format product name using template
 */
function formatProductName(title: string, template?: string): string {
  if (!template) {
    return title;
  }
  return template.replace("[title]", title);
}

/**
 * Process a single payable file and sync it to Polar
 * @returns true if product was synced, false if file was skipped
 */
async function processPayableFile(
  filePath: string,
  collectionConfig: ResolvedMonaKioskConfig["collections"][number],
  config: ResolvedMonaKioskConfig,
  state: Awaited<ReturnType<typeof readStateFile>>,
): Promise<boolean> {
  const fileInfo = await stat(filePath);
  const content = await readFile(filePath, "utf-8");
  const { data } = matter(content);

  // Check if file has price (payable content)
  if (typeof data.price !== "number") {
    return false;
  }

  const payableData = data as PayableData;
  const currency = payableData.currency || "usd";

  // Generate content ID from file path
  const canonicalId = pathToContentId({
    filePath,
    collection: collectionConfig.name,
    frontmatterSlug: payableData.slug,
  });
  const slug = canonicalId.slice(collectionConfig.name.length + 1);

  const title = payableData.title || slug;
  const description = payableData.description || `Premium content: ${title}`;
  const updatedAt = Math.trunc(fileInfo.mtimeMs);

  // Get file IDs from state instead of uploading
  const fileIds: string[] = [];
  if (payableData.downloads && payableData.downloads.length > 0) {
    const cachedFileIds = getCachedFileIds(state, canonicalId);

    if (cachedFileIds.length === 0) {
      console.warn(
        `  ⚠️ Content has ${payableData.downloads.length} downloads but no uploaded files in state.`,
      );
      console.warn(`     Run 'pnpm mona-kiosk upload' first.`);
    } else if (cachedFileIds.length !== payableData.downloads.length) {
      console.warn(
        `  ⚠️ Mismatch: ${payableData.downloads.length} downloads in frontmatter, ${cachedFileIds.length} in state.`,
      );
      console.warn(`     Run 'pnpm mona-kiosk upload' to sync.`);
    } else {
      console.log(`  📦 Using ${cachedFileIds.length} cached file(s)`);
      fileIds.push(...cachedFileIds);
    }
  }

  // Generate content URL
  const contentUrl = `${config.siteUrl}/${canonicalId}`;

  // Create or update product based on pricing model
  const productData = {
    name: formatProductName(title, config.productNameTemplate),
    description,
    price: payableData.price,
    currency,
    contentId: canonicalId,
    collection: collectionConfig.name,
    updatedAt,
    contentUrl,
    fileIds,
    hasDownloads: fileIds.length > 0,
    ...(isSubscriptionData(payableData) && { interval: payableData.interval }),
  };

  const product = await upsertProduct(productData);

  const productType = isSubscriptionData(payableData)
    ? "subscription"
    : "one-time";
  console.log(`  ✓ Synced (${productType}): ${title} → ${product.id}`);

  // Store mapping
  cacheProductMappings({
    canonicalId,
    productId: product.id,
  });

  return true;
}

/**
 * Sync all payable content to Polar.sh by parsing files directly
 */
export async function syncProductsToPolar(config: ResolvedMonaKioskConfig) {
  console.log("🔄 Syncing products to Polar.sh...");

  // Read state file
  const state = await readStateFile();

  let totalSynced = 0;

  for (const collectionConfig of config.collections) {
    const pattern = collectionConfig.include;

    try {
      const files = await glob(pattern, {
        absolute: true,
        onlyFiles: true,
      });

      if (!files || files.length === 0) {
        console.warn(`  ⚠️ No files found for pattern: ${pattern}`);
        continue;
      }

      console.log(
        `  🕵️‍♀️ Found ${files.length} files to process, pattern: ${pattern}`,
      );

      for (const filePath of files) {
        try {
          const wasSynced = await processPayableFile(
            filePath,
            collectionConfig,
            config,
            state,
          );
          if (wasSynced) {
            totalSynced++;
          }
        } catch (error) {
          throw new Error(
            `  ✗ Failed to sync ${filePath}: ${(error as Error).message}`,
            {
              cause: error,
            },
          );
        }
      }
    } catch (error) {
      throw new Error(
        `  ✗ Failed to process pattern ${pattern}: ${(error as Error).message}`,
        {
          cause: error,
        },
      );
    }
  }

  console.log(`✅ Synced ${totalSynced} products to Polar.sh`);
}
