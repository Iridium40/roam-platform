import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Plugin to stub server-only imports in client code
const stubServerModulesPlugin = () => {
  return {
    name: 'stub-server-modules',
    resolveId(id: string) {
      // Stub Twilio (server-only library)
      if (
        id === 'twilio' || 
        id.includes('twilio/lib/index.js') || 
        id.includes('twilio/lib') ||
        id.includes('node_modules/twilio')
      ) {
        return path.resolve(__dirname, "./client/utils/twilio-stub.ts");
      }
      // Stub Stripe server SDK (client uses @stripe/stripe-js instead)
      if (
        id === 'stripe' ||
        id.includes('node_modules/stripe')
      ) {
        return path.resolve(__dirname, "./client/utils/stripe-stub.ts");
      }
      return null;
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
    stubServerModulesPlugin(),
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
      // Stub out Twilio, Stripe, and Node.js modules for browser - they're only used server-side
      "twilio": path.resolve(__dirname, "./client/utils/twilio-stub.ts"),
      "stripe": path.resolve(__dirname, "./client/utils/stripe-stub.ts"),
      "agent-base": path.resolve(__dirname, "./client/utils/node-stub.ts"),
      "https-proxy-agent": path.resolve(__dirname, "./client/utils/node-stub.ts"),
      "http-proxy-agent": path.resolve(__dirname, "./client/utils/node-stub.ts"),
      "socks-proxy-agent": path.resolve(__dirname, "./client/utils/node-stub.ts"),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime', 'date-fns'],
    exclude: ['twilio', '@twilio/conversations', 'stripe'],
  },
  build: {
    outDir: "dist/spa",
    assetsDir: "assets",
    emptyOutDir: true,
    commonjsOptions: {
      include: [/date-fns/, /node_modules/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: undefined,
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
      // Note: Server-only modules (twilio, stripe) are handled by stubServerModulesPlugin
      // instead of marking them as external (which breaks browser loading)
    },
  },
});
