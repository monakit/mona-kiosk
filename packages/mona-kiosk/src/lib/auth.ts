import type { Benefit } from "@polar-sh/sdk/models/components/benefit";
import type { AstroCookies } from "astro";
import {
  COOKIE_NAMES,
  POLAR_API_PAGE_SIZE,
  SESSION_COOKIE_OPTIONS,
} from "../constants";
import { getGlobalConfig } from "../integration/config";
import { getPolarClient } from "../lib/polar-client";
import { findFirstListItem, normaliseMetadataValue } from "../lib/polar-finder";

interface ValidateCustomerAccessOptions {
  customerId: string;
  contentId: string;
}

/**
 * Find customer by email in Polar
 */
async function findCustomerByEmail(email: string): Promise<string | null> {
  const polar = getPolarClient();
  const globalConfig = getGlobalConfig();
  const normalisedEmail = email.trim().toLowerCase();

  try {
    const customer = await findFirstListItem({
      list: (args) => polar.customers.list(args),
      args: {
        organizationId: globalConfig.polar.organizationId,
        email: normalisedEmail,
      },
      predicate: (item) =>
        typeof item.email === "string" &&
        item.email.trim().toLowerCase() === normalisedEmail,
    });

    return customer?.id ?? null;
  } catch (error) {
    console.error("Error finding customer by email:", error);
    return null;
  }
}

/**
 * Find benefit by content_id metadata
 */
async function findBenefitByContentId(
  contentId: string,
): Promise<Benefit | null> {
  const polar = getPolarClient();
  const globalConfig = getGlobalConfig();

  try {
    const benefit = await findFirstListItem({
      list: (args) => polar.benefits.list(args),
      args: {
        organizationId: globalConfig.polar.organizationId,
        metadata: { content_id: contentId },
        limit: POLAR_API_PAGE_SIZE,
      },
      predicate: (item: Benefit) =>
        normaliseMetadataValue(item.metadata?.content_id) === contentId,
    });

    return benefit ?? null;
  } catch (error) {
    console.error("Error finding benefit by content_id:", error);
    return null;
  }
}

/**
 * Create a customer session with Polar
 * First finds customer by email, then creates session
 */
export async function createCustomerSession(email: string) {
  const polar = getPolarClient();

  // Find existing customer by email
  const customerId = await findCustomerByEmail(email);

  if (!customerId) {
    throw new Error(
      "Customer not found. Please purchase content first or check your email address.",
    );
  }

  // Create customer session using customer ID
  const session = await polar.customerSessions.create({
    customerId,
  });

  return {
    token: session.token,
    expiresAt: session.expiresAt,
    customerId: session.customerId,
  };
}

/**
 * Validate customer access to a product
 */
export async function validateCustomerAccess(
  customerToken: string,
  options: ValidateCustomerAccessOptions,
): Promise<boolean> {
  if (!customerToken || !options.customerId || !options.contentId) {
    return false;
  }

  const polar = getPolarClient();
  const customerId = options.customerId;
  const contentId = options.contentId;

  try {
    // Find the benefit associated with this content
    const benefit = await findBenefitByContentId(contentId);
    if (!benefit) {
      console.warn(
        `[MonaKiosk] No benefit found for content_id: ${contentId}. Make sure to run a build first to sync products and benefits.`,
      );
      return false;
    }

    // Query benefit grants for this specific benefit and customer
    const grants = await polar.benefits.grants({
      id: benefit.id,
      customerId: customerId,
      isGranted: true,
      limit: 1,
    });

    return grants.result.items.length > 0;
  } catch (error) {
    console.error("Failed to validate customer access via Polar:", error);
    return false;
  }
}

/**
 * Set session cookie
 */
export function setSessionCookie(
  cookies: AstroCookies,
  token: string,
  expiresAt: Date,
  customerId: string,
  customerEmail: string,
) {
  const options = { ...SESSION_COOKIE_OPTIONS, expires: expiresAt };

  cookies.set(COOKIE_NAMES.SESSION, token, options);
  cookies.set(COOKIE_NAMES.CUSTOMER_ID, customerId, options);
  cookies.set(COOKIE_NAMES.CUSTOMER_EMAIL, customerEmail, options);
}

/**
 * Clear session cookie
 */
export function clearSessionCookie(cookies: AstroCookies) {
  const options = {
    path: SESSION_COOKIE_OPTIONS.path,
  };

  cookies.delete(COOKIE_NAMES.SESSION, options);
  cookies.delete(COOKIE_NAMES.CUSTOMER_ID, options);
  cookies.delete(COOKIE_NAMES.CUSTOMER_EMAIL, options);
}

export function hasPolarSession(cookies: AstroCookies) {
  const customerToken = cookies.get(COOKIE_NAMES.SESSION)?.value;
  const customerId = cookies.get(COOKIE_NAMES.CUSTOMER_ID)?.value;
  return !!(customerToken && customerId);
}

/**
 * Get customer info from session token using Customer Portal API
 */
export async function getCustomerFromToken(
  customerToken: string,
): Promise<{ id: string; email: string } | null> {
  try {
    const polar = getPolarClient();
    const customer = await polar.customerPortal.customers.get({
      customerSession: customerToken,
    });

    return {
      id: customer.id,
      email: customer.email,
    };
  } catch (error) {
    console.error("Error getting customer from token:", error);
    return null;
  }
}
