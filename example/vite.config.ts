import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    // The example links the library from the repository root, which sits
    // outside this project directory.
    fs: { allow: ['..'] },
  },
});
