import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select', '@radix-ui/react-tabs'],
          'vendor-icons': ['lucide-react'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-stripe': ['@stripe/stripe-js', '@stripe/react-stripe-js'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: process.env.NODE_ENV === 'development',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: process.env.NODE_ENV === 'production',
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'lucide-react',
    ],
    exclude: [
      '@stripe/stripe-js',
      '@stripe/react-stripe-js',
    ],
  },
  server: {
    port: 8080,
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
});
