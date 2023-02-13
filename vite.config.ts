import { defineConfig } from "vite";
import eslintPlugin from "vite-plugin-eslint";
import html from "@web/rollup-plugin-html";
import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import minifyHTML from "rollup-plugin-minify-html-literals";
import viteCompression from 'vite-plugin-compression';

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
  plugins: [
    eslintPlugin(),
    viteCompression({
      verbose: false,
      filter: (fileName: string) => /\.(js|css|html|txt|xml|json|svg|ico|ttf|otf|eot)$/.test(fileName),
      algorithm: 'brotliCompress',
      ext: ".br"
    }),
  ],
});
