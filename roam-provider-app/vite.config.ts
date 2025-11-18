import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Plugin to stub Twilio imports in client code (server-only library)
const stubTwilioPlugin = () => {
  return {
    name: 'stub-twilio',
    resolveId(id: string) {
      // Handle twilio imports from any source, including file system paths
      if (
        id === 'twilio' || 
        id.includes('twilio/lib/index.js') || 
        id.includes('twilio/lib') ||
        id.includes('node_modules/twilio')
      ) {
        // Redirect to our stub file
        return path.resolve(__dirname, "./client/lib/stubs/twilio-stub.ts");
      }
      return null;
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), stubTwilioPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
      // Stub Twilio for client-side (server-only library)
      "twilio": path.resolve(__dirname, "./client/lib/stubs/twilio-stub.ts"),
    },
  },
  optimizeDeps: {
    exclude: ['twilio'], // Exclude Twilio from client bundle (server-only)
  },
  build: {
    outDir: "dist/spa",
  },
  server: {
    port: 5177,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
