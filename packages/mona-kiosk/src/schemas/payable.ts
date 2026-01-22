import { z } from "astro/zod";

/**
 * Schema for payable content in Astro content collections
 * Supports both one-time purchases and subscriptions
 * - One-time purchase: price and currency (no interval)
 * - Subscription: price, currency, and interval
 */
export const PayableMetadata = z.object({
  price: z.coerce
    .number()
    .int()
    .min(1)
    .describe("Price in cents (one-time) or per billing cycle (subscription)")
    .optional(),
  currency: z
    .string()
    .default("usd")
    .describe("Polar supported currency code.")
    .optional(),
  interval: z
    .enum(["month", "year", "week", "day"])
    .describe("Billing interval for subscriptions")
    .optional(),
  downloads: z
    .array(
      z.object({
        title: z.string().describe("Display name for the download"),
        file: z
          .string()
          .describe(
            "Path to file relative to content (e.g., './files/source.zip')",
          ),
        description: z.string().optional().describe("Optional description"),
      }),
    )
    .optional()
    .describe("Downloadable files for this content"),
});

export type PayableMetadataType = z.infer<typeof PayableMetadata>;

export interface PayableContent {
  title?: string;
  description?: string;
  price: number;
  currency?: string;
  interval?: "month" | "year" | "week" | "day";
  downloads?: Array<{
    title: string;
    file: string;
    description?: string;
  }>;
}

/**
 * Type for Astro content collection entries with payable content
 */
export type PayableEntry = {
  id: string;
  slug?: string;
  body: string;
  rendered?: { html: string } | null;
  data: PayableContent;
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

/**
 * Type guard to check if a collection entry has payable metadata
 */
export function isPayableEntry(entry: unknown): entry is PayableEntry {
  if (!isRecord(entry)) {
    return false;
  }

  if (typeof entry.id !== "string") {
    return false;
  }

  if (typeof entry.body !== "string") {
    return false;
  }

  if ("slug" in entry && entry.slug != null && typeof entry.slug !== "string") {
    return false;
  }

  if (!isRecord(entry.data)) {
    return false;
  }

  const price = entry.data.price;
  return typeof price === "number" && price > 0;
}
