import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  // F5 in Visual Studio only runs `npm run dev`; Vite opens the browser itself once the server is ready.
  server: { port: 5173, strictPort: true, open: true },
  build: {
    // Three.js alone is about 750 kB minified (190 kB gzip); it is split off and cached.
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Keep Three.js in its own long-cached chunk.
        manualChunks: (id) => (id.includes('node_modules/three/') ? 'three' : undefined),
      },
    },
  },
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
