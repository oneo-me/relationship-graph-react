import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // Library builds must reference emitted chunks relative to the package, not
  // relative to the site root.
  base: './',
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: () => 'index.js',
    },
    sourcemap: true,
    rollupOptions: {
      external: (id) =>
        id === 'react' ||
        id.startsWith('react/') ||
        id.startsWith('react-dom') ||
        id.startsWith('d3-'),
    },
  },
  worker: {
    format: 'es',
  },
});
