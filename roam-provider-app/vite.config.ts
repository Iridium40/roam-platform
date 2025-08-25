import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false, // Disable error overlay that can cause HMR issues
      port: 8081, // Use a different port for HMR WebSocket
      clientPort: 8081, // Client should connect to HMR on this port
      // Add fallback for hosted environments
      host: "localhost",
      // Handle WebSocket connection errors gracefully
      watchOptions: {
        usePolling: true, // Use polling instead of filesystem events
        interval: 1000,
      },
    },
    fs: {
      allow: ["./client", "./shared"],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "server/**"],
    },
    headers: {
      "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://apis.google.com https://accounts.google.com https://maps.googleapis.com https://www.gstatic.com https://cdn.plaid.com https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com https://maps.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://api.stripe.com https://vssomyuyhicaxsgiaupo.supabase.co https://maps.googleapis.com https://accounts.google.com https://production.plaid.com https://sandbox.plaid.com https://va.vercel-scripts.com wss://vssomyuyhicaxsgiaupo.supabase.co ws://localhost:8081 ws://localhost:8080 wss://localhost:8081 wss://localhost:8080; frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://accounts.google.com https://cdn.plaid.com; object-src 'none'; base-uri 'self'",
    },
  },
  build: {
    outDir: "dist/spa",
    target: "esnext",
    minify: "esbuild",
    rollupOptions: {
      external: [],
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));


