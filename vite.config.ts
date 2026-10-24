import { defineConfig } from 'vite';

// Served from https://trmytelabs.github.io/maximalist/ on GitHub Pages (default base).
// Other targets override base on the command line and nothing here depends on its value:
//   npx vite build --base /            (VPS, .github/workflows/deploy.yml)
//   npx vite build --base ./           (single-file artifact, tools/artifact_prep.py)
// src/ reads import.meta.env.BASE_URL for models/ and textures/, which works with all three.
export default defineConfig({
  base: '/maximalist/',
  build: {
    // Anything that runs the game needs WebGL2 + Web Audio + ES modules, so the baseline is
    // already a 2022-era browser; compiling to es2022 skips the class-field / async / optional-
    // chaining downlevel helpers that the default target would add back in.
    target: ['es2022', 'chrome107', 'edge107', 'firefox104', 'safari16'],
    sourcemap: false,
    // No src/ imports assets (textures and GLBs live in public/), so this only guards
    // against someone later importing a sprite: keep small ones inline, nothing bigger.
    assetsInlineLimit: 4096,
    // The three.js chunk is ~650 kB minified by design; warn only if something regresses past that.
    chunkSizeWarningLimit: 720,
    rollupOptions: {
      output: {
        // Split vendor code from app code:
        //   three  = three.js core + the examples/jsm passes, Reflector, GLTFLoader, RoomEnvironment
        //   index  = the game (src/**)
        // The three chunk's hash only changes when the dependency is upgraded, so repeat visits
        // (and every re-deploy of the game) re-download only the small app chunk. The two chunks
        // also download in parallel on first load thanks to the <link rel="modulepreload"> Vite emits.
        manualChunks(id) {
          if (id.includes('/node_modules/three/') || id.includes('\\node_modules\\three\\')) return 'three';
        },
      },
    },
  },
  esbuild: {
    // Strip debug logging from production output. console.warn / console.error are kept on purpose:
    // the WebGL fallbacks in src/crt.ts, src/era3gl.ts and src/era5gl.ts report through them, and
    // three.js uses them for shader-compile diagnostics that are worth having on a real phone.
    pure: ['console.log', 'console.debug', 'console.info', 'console.trace'],
    drop: ['debugger'],
    legalComments: 'none',
  },
});
