#!/usr/bin/env tsx
import { loadConfigFromAstro } from "./load-config.js";
import { uploadDownloadables } from "./upload.js";

const command = process.argv[2];

async function main() {
  // Load config from astro.config.mjs
  try {
    await loadConfigFromAstro();
  } catch (error) {
    console.error("❌ Failed to load config:", (error as Error).message);
    process.exit(1);
  }

  if (!command || command === "upload") {
    await uploadDownloadables();
  } else {
    console.error(`Unknown command: ${command}`);
    console.log(`
Usage:
  mona-kiosk upload    Upload downloadable files to Polar
		`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
