import { defineConfig } from "vite";
import html from "@web/rollup-plugin-html";
import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import minifyHTML from "@lit-labs/rollup-plugin-minify-html-literals";
import { compression } from "vite-plugin-compression2";

export default defineConfig({
  build: {
    rollupOptions: {
      plugins: [
        html({
          input: "index.html",
        }),
        resolve(),
        // Minify HTML template literals
        minifyHTML(),
        // Minify JS
        terser({
          ecma: 2020,
          module: true,
        }),
      ],
      preserveEntrySignatures: "strict",
    },
  },
  plugins: [compression()],
});
