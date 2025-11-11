export interface ErrorContext {
  title: string;
  message?: string;
  error?: unknown;
}

/**
 * Render a consistent HTML snippet for Mona Kiosk errors.
 */
export function renderErrorHtml(ctx: ErrorContext): string {
  const { title, message, error } = ctx;
  let detail = message ?? "";

  if (!detail) {
    if (error instanceof Error) {
      detail = error.message;
    } else if (typeof error === "string") {
      detail = error;
    } else if (error != null) {
      detail = String(error);
    }
  }

  return `<div class="mona-kiosk-error" style="background: #fee; border: 2px solid #c00; padding: 1rem; border-radius: 8px; color: #c00;">
      <h3>${title}</h3>
      <p>${detail || "An unexpected error occurred."}</p>
    </div>`;
}
