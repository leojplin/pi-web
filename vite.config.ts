import { defineConfig } from "vite";

export default defineConfig({
  root: "src/client",
  build: {
    outDir: "../../dist/client",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@codemirror/legacy-modes")) return "vendor-editor-legacy";
          if (id.includes("@lezer/common") || id.includes("@lezer/highlight") || id.includes("@lezer/lr")) return "vendor-editor-core";
          if (id.includes("@codemirror/lang-") || id.includes("@lezer/")) return "vendor-editor-languages";
          if (id.includes("@codemirror") || id.includes("codemirror")) return "vendor-editor-core";
          if (id.includes("@xterm")) return "vendor-terminal";
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": { target: "http://localhost:3000", ws: true },
    },
  },
});
