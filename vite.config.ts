import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// Compile the UI for embedding in the desktop executable; no web server.
export default defineConfig(() => {
  return {
    plugins: [tailwindcss(), react()],

    resolve: {
      // ui-kit/node_modules holds a second @hugeicons copy; one is enough (PERF-25).
      dedupe: ["@hugeicons/react", "@hugeicons/core-free-icons"],
    },
    build: {
      // Flag files stay files, fetched when a flag is shown; inlined, they
      // would sit in the script as data URIs (PERF-16).
      assetsInlineLimit: (file: string) => (file.includes("/flag-icons/flags/") ? false : undefined),
      rollupOptions: {
        input: {
          main: here("./index.html"),
        },
      },
    },

  };
});
