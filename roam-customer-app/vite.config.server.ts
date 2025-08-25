import { defineConfig } from "vite";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    outDir: "dist/server",
    rollupOptions: {
      input: {
        "node-build": path.resolve(__dirname, "server/node-build.ts"),
        index: path.resolve(__dirname, "server/index.ts"),
      },
      output: {
        format: "es",
        entryFileNames: "[name].mjs",
        chunkFileNames: "[name].mjs",
        assetFileNames: "[name].[ext]",
      },
    },
    target: "node18",
    ssr: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
});
