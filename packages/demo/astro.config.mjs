// @ts-check

import mdx from "@astrojs/mdx";
import node from "@astrojs/node";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import { monaKiosk } from "mona-kiosk";
import { loadEnv } from "vite";

const {
  POLAR_ACCESS_TOKEN,
  ORGANIZATION_SLUG,
  ORGANIZATION_ID,
  POLAR_SERVER,
  ACCESS_COOKIE_SECRET,
  SITE_URL,
} = loadEnv(process.env.NODE_ENV, process.cwd(), "");

// https://astro.build/config
export default defineConfig({
  server: {
    allowedHosts: true,
  },

  output: "server",
  site: SITE_URL || "http://localhost:4321",

  integrations: [
    mdx(),
    sitemap(),
    monaKiosk({
      polar: {
        accessToken: POLAR_ACCESS_TOKEN,
        organizationSlug: ORGANIZATION_SLUG,
        organizationId: ORGANIZATION_ID,
        server: POLAR_SERVER || "sandbox",
      },
      collections: [
        {
          include: "src/content/blog/**/*.md",
        },
        {
          include: "src/content/courses/**/*.md",
          group: { index: "toc", childCollection: "courseChapters" },
        },
      ],
      siteUrl: SITE_URL || "http://localhost:4321",
      accessCookieSecret: ACCESS_COOKIE_SECRET,
    }),
  ],

  adapter: node({
    mode: "standalone",
  }),
});
