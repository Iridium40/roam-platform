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
    rollupOptions: {
      output: {
        // Optimize chunk splitting
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'router-vendor': ['react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-toast'],
          'form-vendor': ['react-hook-form', '@hookform/resolvers'],
          'stripe-vendor': ['@stripe/react-stripe-js', '@stripe/stripe-js'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'utils-vendor': ['date-fns', 'clsx', 'tailwind-merge'],
          'icons-vendor': ['lucide-react'],
        },
        // Optimize chunk naming
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `js/[name]-[hash].js`;
        },
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `images/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext)) {
            return `css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
    // Enable source maps for debugging
    sourcemap: mode === 'development',
    // Optimize for production
    minify: mode === 'production' ? 'terser' : false,
    terserOptions: mode === 'production' ? {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    } : undefined,
    // Optimize chunk size warnings
    chunkSizeWarningLimit: 1000,
  },
  plugins: [react(), mode === "development" ? expressPlugin() : null].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'date-fns',
      'clsx',
      'tailwind-merge',
    ],
    exclude: [
      // Exclude large dependencies that should be loaded separately
      '@stripe/react-stripe-js',
      '@stripe/stripe-js',
    ],
  },
  // Define global constants
  define: {
    __DEV__: mode === 'development',
    __PROD__: mode === 'production',
  },
}));

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    configureServer(server) {
      // Dynamically import to avoid build-time issues
      import("./server").then(({ createServer }) => {
        const app = createServer();
        // Add Express app as middleware to Vite dev server
        server.middlewares.use(app);
      }).catch(console.error);
    },
  };
}
