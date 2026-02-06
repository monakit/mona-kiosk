# MonaKiosk

Astro integration for monetizing content with [Polar.sh](https://polar.sh). Add paywalls, authentication, and checkout flows to your content with minimal setup.

## Features

- **Seamless Integration**: Injected API routes for auth, checkout, and portal.
- **Automated Sync**: Payable content syncs to Polar.sh products at build time.
- **Flexible Pricing**: Support for one-time purchases and subscriptions.
- **Digital Downloads**: Attach secure, downloadable files (PDFs, ZIPs) to content.
- **Smart Paywall**: Middleware for access control, previews, and Floating Download Panel.
- **Customizable**: Full control over UI, auth flows, and content grouping.

## Installation

```bash
npm install mona-kiosk
```

## Quick Start

You can find a complete example project in the [demo](../demo/) folder.

### 1. Configure Environment
Set the following environment variables (obtain credentials from your Polar dashboard):

```env
POLAR_ACCESS_TOKEN=polar_oat_...
POLAR_ORG_SLUG=your-org-slug
POLAR_ORG_ID=your-org-id
POLAR_SERVER=sandbox  # or 'production'
ACCESS_COOKIE_SECRET=your-random-secret  # Generate: openssl rand -base64 32
```

### 2. Update Content Collection
Merge `PayableMetadata` into your content schema to enable pricing fields.

```ts
import { defineCollection, z } from "astro:content";
import { PayableMetadata } from "mona-kiosk";

const blog = defineCollection({
  // ...
  schema: ({ image }) => z.object({ /* ... */ }).merge(PayableMetadata),
});
```

Now, add pricing to your content frontmatter:

```yaml
---
title: "Premium Guide"
price: 1000 # $10.00 in cents
---
```

### 3. Add Integration
Update `astro.config.mjs`:

```js
import { defineConfig } from "astro/config";
import { monaKiosk } from "mona-kiosk";
import node from "@astrojs/node"; // or other adapter

export default defineConfig({
  output: "server", // Required
  adapter: node({ mode: "standalone" }),
  integrations: [
    monaKiosk({
      polar: {
        accessToken: process.env.POLAR_ACCESS_TOKEN,
        organizationSlug: process.env.POLAR_ORG_SLUG,
        organizationId: process.env.POLAR_ORG_ID,
        server: process.env.POLAR_SERVER || "sandbox",
      },
      siteUrl: "https://your-site.com",
      accessCookieSecret: process.env.ACCESS_COOKIE_SECRET,
      collections: [{ include: "src/content/blog/**/*.md" }],
    }),
  ],
});
```

### 4. Render Paywall
In your page template (e.g., `src/pages/blog/[...slug].astro`), handle the paywall state provided by `Astro.locals`.

```astro
---
const { slug } = Astro.params;
const post = await getEntry("blog", slug);
const { Content } = await render(post);
---

<Layout>
  {!Astro.locals.paywall?.hasAccess && Astro.locals.paywall?.preview ? (
    <div set:html={Astro.locals.paywall.preview} />
  ) : (
    <Content />
  )}
</Layout>
```

## Key Features

### Downloadable Files
Attach files to your content (e.g., source code, PDFs). These are securely hosted on Polar and only accessible to verified purchasers.

1.  **Define in Frontmatter**:
    ```yaml
    downloads:
      - title: "Source Code"
        file: "./files/source.zip"
    ```
2.  **Upload Files**: Run `pnpm mona-kiosk upload` to sync files to Polar.
3.  **Commit State**: Commit the generated `mona-kiosk/state.json` file to git.
4.  **Build**: `pnpm astro build` automatically creates the benefits on Polar using the uploaded file IDs.

*Note: Purchasers will automatically see a floating download panel when accessing the content.*

### Payment Button
Use the included component to place buy buttons anywhere on your site:

```astro
import PaymentButton from "mona-kiosk/components/PaymentButton.astro";

<PaymentButton contentId="my-premium-post" price={1000} label="Buy Now" />
```

### Course/Grouped Content
Bundle multiple content files under a single product (e.g., a course with chapters) using the `group` configuration.

```js
// astro.config.mjs
collections: [{
  include: "src/content/course/**/*.md",
  group: { index: "intro" } // 'intro.md' becomes the main product; others inherit access
}]
```

## Configuration Reference

| Option | Description |
|:---|:---|
| `polar` | Connection details (`accessToken`, `server`, etc.). |
| `siteUrl` | Base URL for your site (used for redirects and webhooks). |
| `collections` | Array of content sources to protect. |
| `accessCookieSecret` | Secret for signing access cookies. |
| `signinPagePath` | Custom sign-in page path (default: `/mona-kiosk/signin`). |
| `isAuthenticated` | Custom function to override auth checks (advanced). |
| `checkAccess` | Custom function to override access logic (advanced). |
| `middlewareOrder` | Run `"pre"` (default) or `"post"` your own middleware. |

### API Routes
MonaKiosk automatically injects the following routes:
- `/api/mona-kiosk/checkout`: Creates checkout sessions.
- `/api/mona-kiosk/portal`: Redirects to the Polar customer portal.
- `/api/mona-kiosk/auth/*`: Handles authentication flows.

## Support Us

To help you get started, we’ve created a comprehensive guide: [MonaKiosk in Action](https://www.mymona.xyz/courses/monakiosk-in-action). This guide itself serves as a showcase of a paywalled content group. If you’d like to support our work, consider purchasing the guide.

## License

MIT
