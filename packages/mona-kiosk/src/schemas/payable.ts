import type { CollectionEntry } from "astro:content";
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
});

export type PayableMetadataType = z.infer<typeof PayableMetadata>;

export interface PayableContent {
  title?: string;
  description?: string;
  price: number;
  currency?: string;
  interval?: "month" | "year" | "week" | "day";
}

/**
 * Type for Astro content collection entries with payable content
 */
export type PayableEntry<T extends string = string> = CollectionEntry<T> & {
  data: PayableContent;
};

/**
 * Type guard to check if a collection entry has payable metadata
 */
export function isPayableEntry<T extends string>(
  entry: CollectionEntry<T>,
): entry is PayableEntry<T> {
  const data = entry.data as unknown;
  return (
    data != null &&
    typeof data === "object" &&
    "price" in data &&
    typeof data.price === "number" &&
    data.price > 0
  );
}
