# MonaKiosk

An Astro integration for monetizing your content with [Polar.sh](https://polar.sh).

Add paywalls, authentication, and checkout flows to your Astro-powered sites with minimal setup.

**Live showcase:** [Mona](https://www.mymona.xyz/)

## What is MonaKiosk?

MonaKiosk transforms your Astro content into monetizable products. It handles the entire monetization workflow—from product sync to customer authentication to access control—so you can focus on creating content.

### How It Works

1. **Mark content as payable** - Add `price` to your content frontmatter
2. **Configure the integration** - Connect your Polar account in Astro config
3. **Build & sync** - Products automatically sync to Polar at build time
4. **Middleware handles the rest** - Paywalls, auth, and access control work automatically

## Key Features

- **Automatic Paywall Middleware** - Intercepts payable content and enforces access control
- **Injected API Routes** - Authentication, checkout, and customer portal endpoints included
- **Build-Time Sync** - Content automatically syncs to Polar products and benefits
- **Flexible Pricing** - Support for one-time purchases and subscription intervals
- **Downloadable Files** - Attach files (PDFs, ZIPs, etc.) to paywalled content
- **Customizable Templates** - Override default paywall and download panel designs
- **Session Management** - Email-based authentication with HttpOnly cookies
- **SSR-Required** - Server-side rendering ensures secure access control

## Repository Structure

This is a monorepo containing:

- **packages/mona-kiosk** - The main Astro integration package
- **packages/demo** - Example implementation using the blog template

## Quick Start

```bash
npm install mona-kiosk
```

### Basic Configuration

```typescript
// astro.config.mjs
import { defineConfig } from "astro/config";
import { monaKiosk } from "mona-kiosk";
import node from "@astrojs/node";

export default defineConfig({
  output: "server", // SSR required
  adapter: node({ mode: "standalone" }),
  integrations: [
    monaKiosk({
      polar: {
        accessToken: process.env.POLAR_ACCESS_TOKEN,
        organizationSlug: process.env.POLAR_ORG_SLUG,
        organizationId: process.env.POLAR_ORG_ID,
        server: "sandbox", // or "production"
      },
      siteUrl: "https://example.com",
      collections: [
        { include: "src/content/blog/**/*.md" },
      ],
    }),
  ],
});
```

### Add Price to Content

```markdown
---
title: 'Premium Tutorial'
description: 'Learn advanced techniques'
price: 2000 # $20 in cents
---

Your premium content here...
```

That's it! MonaKiosk handles product creation, paywall rendering, and access control.

**Full documentation:** [packages/mona-kiosk/README.md](./packages/mona-kiosk/README.md)

## Use Cases

MonaKiosk is designed for **personal static sites** and **independent creators**:

- Premium blog posts and articles
- Subscription-based content access
- Digital product downloads (source code, templates, PDFs)
- Course and tutorial monetization
- Membership tiers with exclusive content

### Not Designed For

- Multi-tenant marketplaces
- Real-time content updates
- Complex permission systems
- Enterprise SaaS applications

### Important: File Upload Workflow

**Downloadable files must be uploaded manually before deployment.** The file upload process is **not** part of the automated build pipeline.

**Why manual upload?**

1. **Keep repos clean** - We discourage storing binary assets (PDFs, ZIPs, videos) in Git repositories
2. **User control** - You decide where to store files locally before uploading to Polar's CDN
3. **Selective uploads** - Only upload what's changed (automatic checksum detection)

**Workflow:**

```bash
# 1. Add downloadable files to your content
# 2. Upload files to Polar (manual step)
pnpm mona-kiosk upload

# 3. Commit the state file
git add mona-kiosk/state.json
git commit -m "Add downloadable files"

# 4. Build and deploy
pnpm astro build
```

The build process reads file IDs from `mona-kiosk/state.json` - it doesn't upload files itself.

## Architecture Highlights

- **Source file-based routing** - API routes are physical files, not virtual modules
- **Middleware injection** - Paywall logic runs before your pages render
- **Build-time optimization** - Products sync during build, not at runtime
- **Git-friendly state** - File upload state tracked in `mona-kiosk/state.json`
- **Extensible benefits** - Support for custom benefits and downloadable files

## Documentation

- **[Full Documentation](./packages/mona-kiosk/README.md)** - Complete setup guide and API reference
- **[CLAUDE.md](./packages/mona-kiosk/CLAUDE.md)** - Architecture and design insights

## Support This Project

Check out our live paywalled post: [MonaKiosk + BetterAuth Integration Guide](https://www.mymona.xyz/blogs/2025-11/astro-paywall-with-monakiosk)

It provides a detailed walkthrough on integrating MonaKiosk with BetterAuth and Polar—a valuable resource for advanced users.

If you'd like to support our work, consider purchasing the guide!

## License

MIT
