import { CustomerPortal } from "@polar-sh/astro";
import type { APIContext } from "astro";
import { COOKIE_NAMES } from "../constants";
import { getGlobalConfig } from "../integration/config";

/**
 * Customer Portal endpoint - redirects to Polar customer portal
 * Requires customer session cookie to be set
 */
export async function GET(context: APIContext) {
  const config = getGlobalConfig();

  // Create handler with config
  const handler = CustomerPortal({
    accessToken: config.polar.accessToken,
    server: config.polar.server,
    returnUrl: context.url.searchParams.get("return") || context.url.origin,
    getCustomerId: async () => {
      const customerId = context.cookies.get(COOKIE_NAMES.CUSTOMER_ID)?.value;

      if (customerId) {
        return customerId;
      }

      throw new Error(
        "No customer authentication found. Please sign in first.",
      );
    },
  });

  return handler(context);
}
