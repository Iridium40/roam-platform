// Dynamic favicon loading from system settings
window.addEventListener("DOMContentLoaded", async function () {
  try {
    // This will be replaced by the actual Supabase configuration
    const response = await fetch("/api/system-config?keys=site_favicon");
    if (response.ok) {
      const config = await response.json();
      const faviconConfig = config.find(
        (c) => c.config_key === "site_favicon",
      );

      if (faviconConfig && faviconConfig.config_value) {
        const favicon = document.getElementById("favicon");
        const appleTouchIcon = document.getElementById("apple-touch-icon");

        if (favicon) favicon.href = faviconConfig.config_value;
        if (appleTouchIcon) appleTouchIcon.href = faviconConfig.config_value;
      }
    }
  } catch (error) {
    console.log("Using default favicon - system config not available");
  }
});
