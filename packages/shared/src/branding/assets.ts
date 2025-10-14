/**
 * Centralised brand asset registry for the ROAM platform.
 *
 * Each asset includes both the local build-time reference (bundled with the shared package)
 * and the public CDN URL hosted in Supabase storage for consistent use across apps and email.
 */

type AssetDescriptor = {
  /** Local URL resolved at build time (works with Vite, Webpack, etc.). */
  local: string;
  /** Public CDN URL hosted in Supabase storage. */
  remote: string;
  /** Short description of where the asset is typically used. */
  description?: string;
};

const SUPABASE_BRAND_BASE_URL =
  "https://ejtstrgtupjyvdwkfndm.supabase.co/storage/v1/object/public/email-brand-images/ROAM";

const resolve = (relativePath: string): string =>
  new URL(relativePath, import.meta.url).href;

export const brandAssets = {
  brand: {
    favicon: {
      local: resolve("./brand/favicon.ico"),
      remote: `${SUPABASE_BRAND_BASE_URL}/favicon.ico`,
      description: "Primary site favicon (all apps)",
    } satisfies AssetDescriptor,
    icon: {
      local: resolve("./brand/roam-icon.png"),
      remote: `${SUPABASE_BRAND_BASE_URL}/roam-icon.png`,
      description: "Squared app icon / social avatar",
    } satisfies AssetDescriptor,
  },
  logo: {
    default: {
      local: resolve("./logo/roam-logo.png"),
      remote: `${SUPABASE_BRAND_BASE_URL}/roam-logo.png`,
      description: "Default dark-on-light ROAM logo",
    } satisfies AssetDescriptor,
    white: {
      local: resolve("./logo/roam-logo-white.png"),
      remote: `${SUPABASE_BRAND_BASE_URL}/roam-logo-white.png`,
      description: "White logo for dark backgrounds",
    } satisfies AssetDescriptor,
    email: {
      local: resolve("./logo/roam-logo-email.png"),
      remote: `${SUPABASE_BRAND_BASE_URL}/roam-logo-email.png`,
      description: "Optimised logo for email templates",
    } satisfies AssetDescriptor,
  },
} as const;

export type BrandAssets = typeof brandAssets;
export type BrandAssetCategory = keyof BrandAssets;
export type BrandAssetKey<C extends BrandAssetCategory> = keyof BrandAssets[C];


