import { fileURLToPath } from "node:url";
import type { AstroConfig, AstroIntegration } from "astro";
import { ROUTES } from "../constants";
import { syncProductsToPolar } from "../lib/product-sync";
import type { MonaKioskConfig, ResolvedMonaKioskConfig } from "./config";
import { setGlobalConfig } from "./config";

export function monaKiosk(config: MonaKioskConfig): AstroIntegration {
  let resolvedConfig: ResolvedMonaKioskConfig | null = null;
  let astroI18n: AstroConfig["i18n"] | undefined;

  const integration = {
    name: "mona-kiosk",
    __monaKioskConfig: config,
    hooks: {
      "astro:config:setup": ({
        addMiddleware,
        config: astroConfig,
        injectRoute,
        logger,
        updateConfig,
      }) => {
        astroI18n = astroConfig.i18n;
        // Config stored in globalThis (accessible across contexts, preserves function handlers)
        resolvedConfig = setGlobalConfig(config, { astroI18n });

        // Add virtual module plugin to bundle config for production
        updateConfig({
          vite: {
            plugins: [
              {
                name: "mona-kiosk-config",
                resolveId(id) {
                  if (id === "virtual:mona-kiosk-config")
                    return "\0virtual:mona-kiosk-config";
                },
                load(id) {
                  if (id === "\0virtual:mona-kiosk-config") {
                    const cfg =
                      resolvedConfig || setGlobalConfig(config, { astroI18n });

                    // Serialize functions as code strings
                    const isAuthFn = cfg.isAuthenticated
                      ? cfg.isAuthenticated.toString()
                      : "undefined";
                    const checkAccessFn = cfg.checkAccess
                      ? cfg.checkAccess.toString()
                      : "undefined";

                    // Serialize preview handlers and group config per collection
                    const collectionsCode = cfg.collections
                      .map((c) => {
                        const previewFn = c.previewHandler
                          ? c.previewHandler.toString()
                          : "undefined";

                        return `{
                      name: ${JSON.stringify(c.name)},
                      include: ${JSON.stringify(c.include)},
                      paywallTemplate: ${JSON.stringify(c.paywallTemplate)},
                      previewHandler: ${previewFn},
                      astroCollection: ${JSON.stringify(c.astroCollection)},
                      group: ${JSON.stringify(c.group)}
                    }`;
                      })
                      .join(",\n");

                    // Generate module with reconstructed functions
                    return `
                    export default {
                      polar: ${JSON.stringify(cfg.polar)},
                      collections: [${collectionsCode}],
                      productNameTemplate: ${JSON.stringify(cfg.productNameTemplate)},
                      signinPagePath: ${JSON.stringify(cfg.signinPagePath)},
                      siteUrl: ${JSON.stringify(cfg.siteUrl)},
                      accessCookieSecret: ${JSON.stringify(cfg.accessCookieSecret)},
                      accessCookieTtlSeconds: ${JSON.stringify(cfg.accessCookieTtlSeconds)},
                      accessCookieMaxEntries: ${JSON.stringify(cfg.accessCookieMaxEntries)},
                      i18n: ${JSON.stringify(cfg.i18n)},
                      isAuthenticated: ${isAuthFn},
                      checkAccess: ${checkAccessFn},
                    };
                  `;
                  }
                },
              },
            ],
          },
        });

        // Resolve absolute paths to route files
        const routesDir = fileURLToPath(new URL("../routes", import.meta.url));

        // Inject API routes
        injectRoute({
          pattern: ROUTES.CHECKOUT,
          entrypoint: `${routesDir}/checkout.ts`,
        });

        injectRoute({
          pattern: ROUTES.AUTH_SIGNIN,
          entrypoint: `${routesDir}/signin.ts`,
        });

        injectRoute({
          pattern: ROUTES.AUTH_SIGNOUT,
          entrypoint: `${routesDir}/signout.ts`,
        });

        injectRoute({
          pattern: ROUTES.PORTAL,
          entrypoint: `${routesDir}/portal.ts`,
        });

        addMiddleware({
          entrypoint: "mona-kiosk/middleware",
          order: config.middlewareOrder ?? "pre",
        });

        logger.info("✅ MonaKiosk middleware enabled");
        logger.info("✅ MonaKiosk routes injected:");
        logger.info(`   - ${ROUTES.CHECKOUT}`);
        logger.info(`   - ${ROUTES.AUTH_SIGNIN}`);
        logger.info(`   - ${ROUTES.AUTH_SIGNOUT}`);
        logger.info(`   - ${ROUTES.PORTAL}`);

        // Only inject default signin page in sandbox mode if no custom path is configured
        if (
          resolvedConfig.polar.server === "sandbox" &&
          !config.signinPagePath
        ) {
          injectRoute({
            pattern: ROUTES.SIGNIN_PAGE,
            entrypoint: `${routesDir}/signin-page.astro`,
          });
          logger.info(
            `   - ${ROUTES.SIGNIN_PAGE} (NOTE: ONLY IN ${resolvedConfig.polar.server} MODE!!!)`,
          );
        }
      },

      "astro:config:done": async ({ logger }) => {
        if (!resolvedConfig) {
          resolvedConfig = setGlobalConfig(config, { astroI18n });
        }

        try {
          await syncProductsToPolar(resolvedConfig);
        } catch (error) {
          logger.error(`❌ Failed to sync products to Polar.sh: ${error}`);
          throw error;
        }
      },
    },
  } satisfies AstroIntegration & { __monaKioskConfig: MonaKioskConfig };

  return integration;
}
