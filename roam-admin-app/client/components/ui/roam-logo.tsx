import * as React from "react";
import { supabase } from "@/lib/supabase";

// Default ROAM Logo URLs - fallbacks if system settings not available
const DEFAULT_ROAM_LOGO_LIGHT_URL =
  "https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2Fb4234ea17f8044d49823701e0c67091f?format=webp&width=800";

const DEFAULT_ROAM_LOGO_DARK_URL =
  "https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2Faf034f03595c4da2abd3db734aa6911c?format=webp&width=800";

// Type for system config rows
interface SystemConfigRow {
  config_key: string;
  config_value: string;
}

// Hook to get logo URLs from system settings
const useSystemLogos = () => {
  const [logoUrls, setLogoUrls] = React.useState({
    light: DEFAULT_ROAM_LOGO_LIGHT_URL,
    dark: DEFAULT_ROAM_LOGO_DARK_URL,
  });

  React.useEffect(() => {
    const fetchSystemLogos = async () => {
      try {
        const { data } = await supabase
          .from("system_config")
          .select("config_key, config_value")
          .in("config_key", ["site_logo", "site_logo_dark"])
          .eq("is_public", true);

        if (data) {
          const configs = data as SystemConfigRow[];
          const lightLogo = configs.find(
            (config) => config.config_key === "site_logo",
          );
          const darkLogo = configs.find(
            (config) => config.config_key === "site_logo_dark",
          );

          setLogoUrls({
            light: lightLogo?.config_value || DEFAULT_ROAM_LOGO_LIGHT_URL,
            dark:
              darkLogo?.config_value ||
              lightLogo?.config_value ||
              DEFAULT_ROAM_LOGO_DARK_URL,
          });
        }
      } catch (error) {
        console.error("Error fetching system logos:", error);
        // Keep default URLs on error
      }
    };

    fetchSystemLogos();
  }, []);

  return logoUrls;
};

// Legacy exports for backwards compatibility
export const ROAM_LOGO_LIGHT_URL = DEFAULT_ROAM_LOGO_LIGHT_URL;
export const ROAM_LOGO_DARK_URL = DEFAULT_ROAM_LOGO_DARK_URL;
export const ROAM_LOGO_URL = ROAM_LOGO_LIGHT_URL;

interface ROAMLogoProps {
  className?: string;
  width?: number;
  height?: number;
  showText?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}

export function ROAMLogo({
  className = "",
  width,
  height,
  showText = true,
  size = "md",
}: ROAMLogoProps) {
  const logoUrls = useSystemLogos();

  // Size presets
  const sizeConfig = {
    sm: { width: 80, height: 40, textClass: "text-sm font-semibold" },
    md: { width: 120, height: 60, textClass: "text-lg font-bold" },
    lg: { width: 160, height: 80, textClass: "text-xl font-bold" },
    xl: { width: 200, height: 100, textClass: "text-2xl font-bold" },
  };

  const config = sizeConfig[size];
  const logoWidth = width || config.width;
  const logoHeight = height || config.height;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Light mode logo - visible in light theme */}
      <img
        src={logoUrls.light}
        alt="ROAM - Your Best Life. Everywhere."
        width={logoWidth}
        height={logoHeight}
        className="object-contain dark:hidden"
        style={{ maxHeight: logoHeight }}
      />
      {/* Dark mode logo - visible in dark theme */}
      <img
        src={logoUrls.dark}
        alt="ROAM - Your Best Life. Everywhere."
        width={logoWidth}
        height={logoHeight}
        className="object-contain hidden dark:block"
        style={{ maxHeight: logoHeight }}
      />
      {showText && (
        <span className={`text-sidebar-foreground ${config.textClass}`}>
          Platform
          <br />
          Management
          <br />
        </span>
      )}
    </div>
  );
}

// Simplified version for just the logo image
export function ROAMLogoImage({
  className = "",
  width = 120,
  height = 60,
}: {
  className?: string;
  width?: number;
  height?: number;
}) {
  const logoUrls = useSystemLogos();

  return (
    <div className={className}>
      {/* Light mode logo - visible in light theme */}
      <img
        src={logoUrls.light}
        alt="ROAM - Your Best Life. Everywhere."
        width={width}
        height={height}
        className="object-contain dark:hidden"
        style={{ maxHeight: height }}
      />
      {/* Dark mode logo - visible in dark theme */}
      <img
        src={logoUrls.dark}
        alt="ROAM - Your Best Life. Everywhere."
        width={width}
        height={height}
        className="object-contain hidden dark:block"
        style={{ maxHeight: height }}
      />
    </div>
  );
}
