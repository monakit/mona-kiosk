import type { APIRoute } from "astro";
import { clearSessionCookie } from "../lib/auth";

/**
 * Sign-out endpoint - clears session cookies and redirects back
 * POST /api/mona-kiosk/auth/signout
 */
export const POST: APIRoute = async ({ cookies, request, redirect }) => {
  try {
    // Clear session cookies
    clearSessionCookie(cookies);

    // Get return URL from Referer header or default to homepage
    const referer = request.headers.get("Referer");
    const returnUrl = referer || "/";

    return redirect(returnUrl, 302);
  } catch (error) {
    console.error("Sign-out error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to sign out. Please try again.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
