import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tanstackRouter from "@tanstack/router-plugin/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    tanstackStart({
      server: { entry: "src/server.ts" },
      codeSplittingOptions: { addHmr: false },
    }),
    react(),
    tailwindcss(),
  ],
});
