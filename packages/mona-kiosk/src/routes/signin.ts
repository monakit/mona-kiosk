import type { APIRoute } from "astro";
import { createCustomerSession, setSessionCookie } from "../lib/auth";

/**
 * Sign-in endpoint - creates a customer session using email
 * POST /api/mona-kiosk/auth/signin
 * Body: { email: string }
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const { email } = body;

    // Validate email
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Valid email is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Create Polar customer session by finding customer by email
    const session = await createCustomerSession(email);

    // Set HttpOnly, Secure cookies
    setSessionCookie(
      cookies,
      session.token,
      new Date(session.expiresAt),
      session.customerId,
      email,
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Sign-in error:", error);

    // Handle specific error messages
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to sign in. Please try again.";

    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
