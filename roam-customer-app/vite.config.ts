import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
  ],
  server: {
    port: 5174,
    strictPort: true,
    host: true,
    proxy: {
      "/api": {
        target: "http://localhost:3004",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
      // Stub out Twilio and Node.js modules for browser - they're only used server-side
      "twilio": path.resolve(__dirname, "./client/utils/twilio-stub.ts"),
      "agent-base": path.resolve(__dirname, "./client/utils/node-stub.ts"),
      "https-proxy-agent": path.resolve(__dirname, "./client/utils/node-stub.ts"),
      "http-proxy-agent": path.resolve(__dirname, "./client/utils/node-stub.ts"),
      "socks-proxy-agent": path.resolve(__dirname, "./client/utils/node-stub.ts"),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime', 'date-fns'],
    exclude: ['twilio', '@twilio/conversations'],
  },
  build: {
    outDir: "dist/spa",
    commonjsOptions: {
      include: [/date-fns/, /node_modules/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      external: (id) => {
        // Exclude Twilio and Node.js-specific modules from browser bundle
        if (
          id === 'twilio' ||
          id.startsWith('twilio/') ||
          id.startsWith('@twilio/') ||
          id === 'agent-base' ||
          id === 'https-proxy-agent' ||
          id === 'http-proxy-agent' ||
          id === 'socks-proxy-agent' ||
          id.startsWith('node:')
        ) {
          return true;
        }
        return false;
      },
    },
  },
});
