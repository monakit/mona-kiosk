import type { APIRoute } from "astro";
import { clearSessionCookie } from "../lib/auth";

/**
 * Sign-out endpoint - clears session cookies and redirects to index page
 * POST /api/mona-kiosk/auth/signout
 */
export const POST: APIRoute = async ({ cookies, redirect }) => {
  try {
    // Clear session cookies
    clearSessionCookie(cookies);

    // Redirect to index page
    return redirect("/", 302);
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
