import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { AstroIntegration } from "astro";
import type { MonaKioskConfig } from "../integration/config";

/**
 * Load MonaKiosk config from astro.config.mjs/ts
 * This allows the CLI to access the same config as the Astro integration
 */
export async function loadConfigFromAstro(cwd: string = process.cwd()) {
  // Try different config file names
  const configFiles = [
    "astro.config.mjs",
    "astro.config.js",
    "astro.config.ts",
    "astro.config.mts",
  ];

  let lastError: Error | null = null;

  for (const configFile of configFiles) {
    const configPath = resolve(cwd, configFile);

    try {
      // Import the config file dynamically
      const configUrl = pathToFileURL(configPath).href;
      const configModule = await import(configUrl);
      const astroConfig = configModule.default;

      if (!astroConfig) {
        continue;
      }

      if (!astroConfig.integrations) {
        lastError = new Error(
          `Found ${configFile} but it has no integrations array`,
        );
        continue;
      }

      // Find MonaKiosk integration in the config
      let foundMonaKiosk = false;
      for (const integration of astroConfig.integrations) {
        if (isMonaKioskIntegration(integration)) {
          foundMonaKiosk = true;
          // Extract config from the integration
          await extractMonaKioskConfig(integration);
          console.log(`✓ Loaded config from ${configFile}`);
          return;
        }
      }

      if (!foundMonaKiosk && astroConfig.integrations.length > 0) {
        const integrationNames = astroConfig.integrations
          .map((i: AstroIntegration) => i.name)
          .join(", ");
        lastError = new Error(
          `Found ${configFile} with integrations [${integrationNames}] but no mona-kiosk integration`,
        );
      }
    } catch (error) {
      // Config file doesn't exist or can't be loaded, try next one
      if ((error as NodeJS.ErrnoException).code !== "ERR_MODULE_NOT_FOUND") {
        lastError = error as Error;
      }
    }
  }

  const errorMessage = lastError
    ? `Could not find MonaKiosk config.\nLast error: ${lastError.message}\n\nSearched in: ${cwd}`
    : `Could not find astro.config.[mjs|js|ts|mts] in ${cwd}`;

  throw new Error(errorMessage);
}

/**
 * Check if an integration is MonaKiosk
 */
function isMonaKioskIntegration(integration: AstroIntegration): boolean {
  return integration.name === "mona-kiosk"; // The actual integration name uses hyphen
}

/**
 * Extract MonaKiosk config from integration
 * The integration function already has the config bound to it
 */
async function extractMonaKioskConfig(
  integration: AstroIntegration,
): Promise<MonaKioskConfig | null> {
  // The integration object has hooks that were set up with the config
  // We need to access the config that was passed to monaKiosk()

  // Try to call the integration's astro:config:setup hook to extract config
  // This is a bit hacky, but necessary since integrations don't expose their config
  const mockAstroConfig: any = {
    integrations: [],
    addMiddleware: () => {},
    injectRoute: () => {},
    logger: {
      info: () => {},
      warn: () => {},
      error: () => {},
    },
  };

  const mockCommand = "build";
  const mockIsRestart = false;

  try {
    // Call the setup hook which will call setGlobalConfig
    if (integration.hooks?.["astro:config:setup"]) {
      await integration.hooks["astro:config:setup"]({
        config: mockAstroConfig,
        command: mockCommand,
        isRestart: mockIsRestart,
        addMiddleware: () => {},
        injectRoute: () => {},
        logger: mockAstroConfig.logger,
        updateConfig: () => ({}),
      } as any);

      // Config should now be set globally
      return null; // Config is already set via setGlobalConfig
    }
  } catch (error) {
    console.warn("Warning: Failed to extract config from integration:", error);
  }

  return null;
}
