import { Checkout } from "@polar-sh/astro";
import type { APIContext } from "astro";
import { COOKIE_NAMES } from "../constants";
import { getGlobalConfig } from "../integration/config";
import { findProductByContentId } from "../lib/polar-client";

/**
 * Checkout endpoint - handles redirects to Polar checkout
 * Query params: ?content=blogs/my-post
 */
export async function GET(context: APIContext) {
  const { url, cookies } = context;
  const contentId = url.searchParams.get("content");

  if (!contentId) {
    return new Response(
      JSON.stringify({ error: "Missing content parameter" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Get product ID from content ID
  const productId = await findProductByContentId(contentId);

  if (!productId) {
    return new Response(
      JSON.stringify({ error: "Product not found for this content" }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  }

  // Get config
  const config = getGlobalConfig();

  // Get customer email from session if available
  const customerEmail = cookies.get(COOKIE_NAMES.CUSTOMER_EMAIL)?.value;

  // Create query params for Polar checkout
  const checkoutParams = new URLSearchParams({
    products: productId,
  });

  if (customerEmail) {
    checkoutParams.set("customerEmail", customerEmail);
  }

  // Use Polar's Checkout utility to handle redirect
  const checkoutHandler = Checkout({
    accessToken: config.polar.accessToken,
    successUrl: `${url.origin}/${contentId}`,
    server: config.polar.server,
  });

  // Modify the URL to include product params
  const modifiedContext = {
    ...context,
    url: new URL(`${url.pathname}?${checkoutParams.toString()}`, url.origin),
  };

  return checkoutHandler(modifiedContext);
}
