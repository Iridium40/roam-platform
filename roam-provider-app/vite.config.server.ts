import { defineConfig } from "vite";
import path from "path";
import { copyFileSync, mkdirSync, existsSync } from "fs";

// Server build configuration
export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, "server/node-build.ts"),
      name: "server",
      fileName: "production",
      formats: ["es"],
    },
    outDir: "dist/server",
    target: "node22",
    ssr: true,
    rollupOptions: {
      external: [
        // Node.js built-ins
        "fs",
        "path",
        "url",
        "http",
        "https",
        "os",
        "crypto",
        "stream",
        "util",
        "events",
        "buffer",
        "querystring",
        "child_process",
        // External dependencies that should not be bundled
        "express",
        "cors",
      ],
      output: {
        format: "es",
        entryFileNames: "[name].mjs",
      },
    },
    minify: false, // Keep readable for debugging
    sourcemap: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  plugins: [
    {
      name: "copy-shared",
      writeBundle() {
        // Copy shared folder to dist/server
        const sharedDir = path.resolve(__dirname, "shared");
        const distSharedDir = path.resolve(__dirname, "dist/server/shared");
        
        if (existsSync(sharedDir)) {
          if (!existsSync(distSharedDir)) {
            mkdirSync(distSharedDir, { recursive: true });
          }
          
          // Copy emailTemplates.ts
          const srcFile = path.join(sharedDir, "emailTemplates.ts");
          const destFile = path.join(distSharedDir, "emailTemplates.js");
          
          if (existsSync(srcFile)) {
            copyFileSync(srcFile, destFile);
            console.log("✅ Copied shared/emailTemplates.ts to dist/server/shared/emailTemplates.js");
          }
        }
      },
    },
  ],
});
