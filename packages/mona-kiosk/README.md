# MonaKiosk

Astro integration for monetizing content with [Polar.sh](https://polar.sh). Add paywalls, authentication, and checkout flows to your content with minimal setup.

## Features

- Injected API routes for auth, checkout, and portal
- Automatic payable content sync to Polar.sh at build time
- One-time & subscription pricing
- Paywall middleware
- Customizable defaults

### Support Us

You can check out our live paywalled post: [MonaKiosk + BetterAuth Integration Guide](https://www.mymona.xyz/blogs/2025-11/astro-paywall-with-monakiosk). It provides a detailed walkthrough on integrating MonaKiosk with BetterAuth and Polar — a valuable resource for advanced users.

If you’d like to support our work, consider purchasing the guide 😉.

Thank you in advance for your support!

## Installation

```bash
npm install mona-kiosk
```

## Quick Start

You can find the whole project in [demo](../demo/).

### 1. Setup Polar

In Polar, configure the environment values required by `.env`:

```env
POLAR_ACCESS_TOKEN=polar_oat_xxxxxxxxxxxxx
POLAR_ORG_SLUG=your-org-slug
POLAR_ORG_ID=your-org-id
POLAR_SERVER=sandbox  # or 'production'
```

### 2. Create an Astro Project

For example, run `pnpm create astro@latest` and choose the `blog` template.

Then install the required packages:

- `@astrojs/node` // or other server adapters
- `mona-kiosk`

The following steps use the Astro blog template as the reference.

### 3. Update Contents

Import `PayableMetadata` and merge it into the collection you want to protect.

```ts
import { PayableMetadata } from "mona-kiosk";

const blog = defineCollection({
  ...
  schema: ({ image }) =>
    z.object(...)
     .merge(PayableMetadata),
});
```

Then, update the metadata in a specific content:

```text
---
title: 'Markdown Style Guide'
description: 'Here is a sample of some basic Markdown syntax that can be used when writing Markdown content in Astro.'
pubDate: 'Jun 19 2024'
heroImage: '../../assets/blog-placeholder-1.jpg'
price: 100 # Price in cents ($1)
---
```

Note: the `currency` field defaults to `usd`. Polar currently supports USD only, so you can leave it unset for now.

### 4. Add Integration

In `astro.config.mjs`:

```typescript
import { defineConfig } from "astro/config";
import { monaKiosk } from "mona-kiosk";

export default defineConfig({
  output: "server", // Required - MonaKiosk needs SSR
  integrations: [
    monaKiosk({
      polar: {
        accessToken: process.env.POLAR_ACCESS_TOKEN,
        organizationSlug: process.env.POLAR_ORG_SLUG,
        organizationId: process.env.POLAR_ORG_ID,
        server: (process.env.POLAR_SERVER as "production" | "sandbox") || "sandbox",
      },
      collections: [
        { include: "src/content/blog/**/*.md" },
      ],
    }),
  ],
  adapter: node({
    mode: "standalone",
  }),
});
```

**What gets injected:**

- `/api/mona-kiosk/checkout` - Create checkout session
- `/api/mona-kiosk/auth/signin` - Email-based sign-in (For internal calling, protect it.)
- `/api/mona-kiosk/auth/signout` - Sign out
- `/api/mona-kiosk/portal` - Redirect to Polar customer portal
- `/mona-kiosk/signin` - Default signin page (Test only, not secure for production)

> **🚨 SECURITY WARNING:** The default `/mona-kiosk/signin` page is provided **ONLY for sandbox testing** and is **NOT secure for production use**.
>
> It will only be injected when `server: "sandbox"` is set AND no custom `signinPagePath` is configured.
>
> For production, you MUST create your own secure sign-in page or use a third-party authentication provider like [BetterAuth](https://github.com/better-auth/better-auth).

### 5. Update Page Template

In `src/pages/blog/[...slug].astro`:

```astro
---
import { getEntry, render } from "astro:content";

const { slug } = Astro.params;
const post = await getEntry("blog", slug);
if (!post) return Astro.redirect("/404");

const { Content } = await render(post);
---

<BlogPost {...post.data}>
 {!Astro.locals.paywall?.hasAccess && Astro.locals.paywall?.preview ? (
    <div set:html={Astro.locals.paywall.preview} />
  ) : (
    <Content />
  )}
</BlogPost>
```

Note: The middleware automatically detects payable content, checks authentication/access, generates previews, and sets `Astro.locals.paywall`.

### 6. Build and Preview

```bash
npm run dev
```

Test card: `4242 4242 4242 4242` (any future date, any CVC)

## How It Works

```mermaid
flowchart TD
  A[User visits /blog/premium-article]
  A --> B{Is this payable content?}

  B -- No --> FULL[Render full content]
  B -- Yes --> C[Check customer session cookie]
  C --> D{Has session?}

  D -- No --> PREVIEW[Generate preview + paywall HTML]
  D -- Yes --> E[Validate access via Polar API]
  E --> F{Access granted?}

  F -- Yes --> FULL
  F -- No --> PREVIEW

  PREVIEW --> S[Set Astro.locals.paywall state]
  FULL --> S2["Set paywall state (full access)"]
  S --> R[Page renders preview or full content]
  S2 --> R
```

## Configuration

```typescript
monaKiosk({
  polar: {
    accessToken: string;
    organizationId: string;
    organizationSlug: string;
    server: "production" | "sandbox";  // Required - always specify explicitly
  },
  collections: [{
    include: string;                    // Glob pattern (e.g., "src/content/blog/**/*.md")
    paywallTemplate?: string;           // Custom paywall HTML
    previewHandler?: PreviewHandler;    // Custom preview function
  }],
  productNameTemplate?: string;         // E.g., "[title] - Premium"
  signinPagePath?: string;              // Default: "/mona-kiosk/signin"
  isAuthenticated?: (context: APIContext) => boolean | Promise<boolean>;  // Custom auth check (must be self-contained)
  checkAccess?: (context: APIContext, contentId: string) => boolean | Promise<boolean>;  // Custom access check (must be self-contained)
})
```

> ⚠️ **Important**: Custom functions (`isAuthenticated`, `checkAccess`, `previewHandler`) must be self-contained. See [Custom Authentication & Access Control](#custom-authentication--access-control) for details.

## Customization

### Custom Paywall Template

Override the default paywall design:

```typescript
monaKiosk({
  collections: [{
    include: "src/content/blog/**/*.md",
    paywallTemplate: `
      {{preview}}

      <div class="paywall">
        <h2>🔒 {{title}}</h2>
        <p>{{description}}</p>
        <div class="price">{{formattedPrice}}</div>
        <a href="{{checkoutUrl}}" class="btn">Purchase Now</a>
        {{signinSection}}
      </div>

      <style>
        .paywall {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 3rem;
          border-radius: 1rem;
          text-align: center;
        }
      </style>
    `
  }]
})
```

**Available template variables:**

- `{{preview}}` - Preview content HTML
- `{{title}}` - Content title
- `{{description}}` - Content description
- `{{price}}` - Price in cents (number)
- `{{formattedPrice}}` - Formatted price (e.g., "$9.99" or "$9.99/month")
- `{{currency}}` - Currency code (uppercase, e.g., "USD")
- `{{checkoutUrl}}` - Checkout URL for this content
- `{{contentId}}` - Content ID (collection/slug)
- `{{collection}}` - Collection name (e.g., "blog")
- `{{signinSection}}` - Sign-in UI (auto-hidden when authenticated)
- `{{signinPagePath}}` - Path to signin page (e.g., "/mona-kiosk/signin")
- `{{isAuthenticated}}` - Boolean: whether user is signed in ("true" or "false" as string)
- `{{isSubscription}}` - Boolean: whether this is a subscription product ("true" or "false" as string)
- `{{interval}}` - Subscription interval ("month", "year", "week", "day") - only for subscriptions
- `{{billingCycle}}` - Human-readable billing cycle (e.g., "month") - only for subscriptions

### Custom Preview Handler

Control how much content to show in preview:

```typescript
monaKiosk({
  collections: [{
    include: "src/content/blog/**/*.md",
    previewHandler: async (entry) => {
      // Access rendered HTML
      if (entry.rendered?.html) {
        const paragraphs = entry.rendered.html.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi);
        return paragraphs?.slice(0, 2).join('\n') + '\n<p>...</p>';
      }

      // Or access raw markdown
      const lines = entry.body.split('\n').slice(0, 10);
      return lines.join('\n') + '\n\n...';
    }
  }]
})
```

### Custom Sign-in Page Path

By default, MonaKiosk links to `/mona-kiosk/signin` in the paywall UI. You can customize this path:

```typescript
monaKiosk({
  signinPagePath: "/auth/signin",  // Your custom signin page path
  ...
})
```

### Custom Authentication & Access Control

Override how MonaKiosk checks authentication and content access. Useful when integrating with external auth systems (BetterAuth, Auth.js, Clerk, etc.) or custom permission logic.

- **`isAuthenticated`**: Controls whether signin link is shown in paywall UI
- **`checkAccess`**: Determines if user can view full content

Both are optional. If not provided, MonaKiosk uses built-in session cookie validation.

#### Important: Function Serialization Limitation

⚠️ **Configuration functions must be self-contained** (no external imports).

MonaKiosk needs to serialize these functions for the build process. Function serialization (`toString()`) only captures the function body, not external dependencies or imports.

✅ **Self-contained inline functions work**

```typescript
monaKiosk({
  isAuthenticated: (context) => {
    // No external dependencies - works fine
    return !!context.locals.user;
  }
})
```

❌ **Don't use inline functions with external dependencies**

```typescript
// ❌ This will NOT work!
monaKiosk({
  isAuthenticated: async (context) => {
    const session = await getSession(context); // External import - breaks at runtime!
    return !!session?.user;
  }
})
```

#### Behavior Matrix

| Scenario | `isAuthenticated` | `checkAccess` | Signin Link | Paywall Shown | Full Content |
|----------|-------------------|---------------|-------------|---------------|--------------|
| Not authenticated | `false` | `false` | ✅ Yes | ✅ Yes | ❌ No |
| Authenticated, not purchased | `true` | `false` | ❌ No | ✅ Yes | ❌ No |
| Authenticated, purchased | `true` | `true` | ❌ No | ❌ No | ✅ Yes |

### Custom Product Names

```typescript
monaKiosk({
  productNameTemplate: "[title] - Premium Access"  // [title] = content title
})
```

### Middleware Order Control

By default, MonaKiosk middleware runs before your custom middleware (`order: "pre"`). If you need to control the execution order, use Astro's built-in `sequence()` function.

#### Default Behavior

```typescript
// astro.config.mjs - MonaKiosk auto-injects with order: "pre"
monaKiosk({ /* config */ })

// src/middleware.ts - runs AFTER MonaKiosk
export const onRequest = (context, next) => {
  console.log('Paywall state:', context.locals.paywall);
  return next();
};
```

#### Custom Order with `sequence()`

To run your middleware before MonaKiosk, or for complete control over execution order:

```typescript
// astro.config.mjs - no changes needed
monaKiosk({ /* config */ })

// src/middleware.ts
import { sequence } from "astro:middleware";
import { onRequest as monaKioskMiddleware } from "mona-kiosk/middleware";

export const onRequest = sequence(
  async (context, next) => {
    // 1. Your auth runs FIRST
    context.locals.user = await getUser(context);
    return next();
  },
  monaKioskMiddleware,  // 2. MonaKiosk runs SECOND
  async (context, next) => {
    // 3. Your logging runs THIRD
    console.log('Paywall state:', context.locals.paywall);
    return next();
  }
);
```

#### Use Cases

**Pattern 1: Auth-First** (Your auth → MonaKiosk checks access)

```typescript
// src/middleware.ts
import { sequence } from "astro:middleware";
import { onRequest as monaKioskMiddleware } from "mona-kiosk/middleware";

export const onRequest = sequence(
  async (context, next) => {
    // Your auth middleware runs first
    context.locals.user = await getUser(context.cookies);
    return next();
  },
  monaKioskMiddleware  // MonaKiosk can now use context.locals.user
);

// astro.config.mjs
monaKiosk({
  isAuthenticated: (context) => !!context.locals.user,
  checkAccess: async (context, contentId) => {
    return context.locals.user?.purchases?.includes(contentId);
  }
})
```

**Pattern 2: MonaKiosk-First** (Default - MonaKiosk handles everything)

```typescript
// astro.config.mjs - no middleware.ts needed
monaKiosk({
  // MonaKiosk handles auth and access checking
})

// Your pages automatically get context.locals.paywall
```

## API Reference

### Types

```typescript
import type { PayableEntry, PaywallState } from "mona-kiosk";
import { isPayableEntry, PayableMetadata } from "mona-kiosk";

// In Astro.locals
interface PaywallState {
  /** Whether the current content has a price and is protected */
  isPayable: boolean;
  /** Whether the user has an active customer session */
  isAuthenticated: boolean;
  /** Whether the authenticated user has purchased access to this content */
  hasAccess: boolean;
  /** Polar product ID for this content */
  productId: string;
  /** Canonical content ID (collection/slug) */
  contentId: string;
  /** Price in cents */
  price?: number;
  /** Currency code */
  currency?: string;
  /** Billing interval for subscriptions */
  interval?: "month" | "year" | "week" | "day";
  /** Content title */
  title?: string;
  /** Content description */
  description?: string;
  /** Preview HTML to render for users without access (includes paywall UI) */
  preview?: string;
}

// PayableMetadata schema (for content collections)
const PayableMetadata = z.object({
  price: z.coerce.number().int().min(1).optional(),  // Optional - content can be free
  currency: z.string().default("usd").optional(),
  interval: z.enum(["month", "year", "week", "day"]).optional(),  // For subscriptions
});

// Type guard for payable content
if (isPayableEntry(entry)) {
  console.log(entry.data.price);  // Type-safe access
  if (entry.data.interval) {
    console.log(`Subscription: ${entry.data.interval}`);  // Subscription
  } else {
    console.log("One-time purchase");
  }
}
```

### Configuration Types

```typescript
import type { MonaKioskConfig, PreviewHandler } from "mona-kiosk";
import type { APIContext } from "astro";

// Full configuration interface
interface MonaKioskConfig {
  polar: PolarConfig;
  collections: CollectionConfig[];
  productNameTemplate?: string;
  signinPagePath?: string;
  isAuthenticated?: (context: APIContext) => boolean | Promise<boolean>;
  checkAccess?: (context: APIContext, contentId: string) => boolean | Promise<boolean>;
}

interface PolarConfig {
  accessToken: string;
  organizationId: string;
  organizationSlug: string;
  server: "production" | "sandbox";  // Required
}

interface CollectionConfig {
  include: string;                    // Required glob pattern
  paywallTemplate?: string;           // Optional custom paywall HTML
  previewHandler?: PreviewHandler;    // Optional custom preview function
}
```

### Polar SDK Access

MonaKiosk exposes a pre-configured Polar SDK client for advanced use cases:

```typescript
import { getPolarClient } from "mona-kiosk";

const polar = getPolarClient();
const products = await polar.products.list({ organizationId: "your-org-id" });
const benefits = await polar.benefits.list({ organizationId: "your-org-id" });
```

This allows you to use the full [Polar SDK](https://github.com/polarsource/polar) without additional setup.

### Advanced API - Session Management

MonaKiosk exports utility functions for advanced session management and constants:

```typescript
import {
  setSessionCookie,
  clearSessionCookie,
  hasPolarSession,
  createCustomerSession,
  COOKIE_NAMES,
  ROUTES,
} from "mona-kiosk";

// Check if user has active Polar session
const isSessionActive = hasPolarSession(cookies);

// Create a new customer session (requires customer email)
const session = await createCustomerSession("user@example.com");

// Manually set session cookies
setSessionCookie(
  cookies,
  session.token,
  new Date(session.expiresAt),
  session.customerId,
  "user@example.com"
);

// Clear session cookies (sign out)
clearSessionCookie(cookies);

// Access cookie names
console.log(COOKIE_NAMES.SESSION);        // "mona_kiosk_session"
console.log(COOKIE_NAMES.CUSTOMER_ID);    // "mona_kiosk_customer_id"
console.log(COOKIE_NAMES.CUSTOMER_EMAIL); // "mona_kiosk_customer_email"

// Access route constants
console.log(ROUTES.CHECKOUT);      // "/api/mona-kiosk/checkout"
console.log(ROUTES.AUTH_SIGNIN);   // "/api/mona-kiosk/auth/signin"
console.log(ROUTES.AUTH_SIGNOUT);  // "/api/mona-kiosk/auth/signout"
console.log(ROUTES.PORTAL);        // "/api/mona-kiosk/portal"
console.log(ROUTES.SIGNIN_PAGE);   // "/mona-kiosk/signin"
```

**Use Cases:**

- Custom authentication flows
- Third-party auth system integration
- Programmatic session management
- Testing and debugging

## Security

- HttpOnly cookies - XSS protection
- Secure flag - HTTPS only in production
- SameSite=lax - CSRF protection
- Server-side validation - All access checks via Polar API
- Session pairing - Token + customer ID for fast validation

## How to Publish

- pnpm pack
- pnpm publish

## License

MIT
