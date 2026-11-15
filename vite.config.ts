import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  // Fixed port: .vscode/launch.json (used by Visual Studio) opens this address.
  server: { port: 5173, strictPort: true },
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
