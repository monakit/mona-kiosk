/**
 * Cookie names used by MonaKiosk
 */
export const COOKIE_NAMES = {
  SESSION: "mona_kiosk_session",
  CUSTOMER_ID: "mona_kiosk_customer_id",
  CUSTOMER_EMAIL: "mona_kiosk_customer_email",
  ACCESS: "mona_kiosk_access",
} as const;

/**
 * API route paths
 */
export const ROUTES = {
  CHECKOUT: "/api/mona-kiosk/checkout",
  AUTH_SIGNIN: "/api/mona-kiosk/auth/signin",
  AUTH_SIGNOUT: "/api/mona-kiosk/auth/signout",
  PORTAL: "/api/mona-kiosk/portal",
  SIGNIN_PAGE: "/mona-kiosk/signin",
} as const;

/**
 * Polar API defaults
 */
export const POLAR_API_PAGE_SIZE = 20;

/**
 * Session cookie options
 */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
} as const;

export const ACCESS_COOKIE_OPTIONS = SESSION_COOKIE_OPTIONS;
