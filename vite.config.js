import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { defineConfig } from 'vite'

function cspInlineScriptHashes() {
  return {
    name: 'kmy-csp-inline-script-hashes',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const hashes = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/giu)]
          .map((match) => match[1])
          .filter((script) => script.trim())
          .map((script) => `'sha256-${createHash('sha256').update(script, 'utf8').digest('base64')}'`);
        if (!hashes.length) return html;
        return html.replace(
          /(script-src\s+'self')([^;]*;)/u,
          (_, directive, rest) => `${directive} ${[...new Set(hashes)].join(' ')}${rest}`,
        );
      },
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/reference-api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        // marketService already requests /api/*; only strip the local proxy prefix.
        // Adding another /api here turns /reference-api/api/companies into
        // /api/api/companies and makes an otherwise healthy backend look broken.
        rewrite: (path) => path.replace(/^\/reference-api/, ''),
      },
    },
  },
  plugins: [
    base44({
      // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
      // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      analyticsTracker: true,
      visualEditAgent: true
    }),
    react(),
    cspInlineScriptHashes(),
  ]
});
