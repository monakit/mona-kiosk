declare namespace App {
  interface Locals {
    paywall?: import("./middleware/index").PaywallState;
  }
}

// Virtual module for config (generated at build time)
declare module "virtual:mona-kiosk-config" {
  import type { ResolvedMonaKioskConfig } from "./integration/config";
  const config: ResolvedMonaKioskConfig;
  export default config;
}
