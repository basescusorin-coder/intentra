import { defineConfig } from 'vite';

// Vercel previews use relative assets. GitHub Pages serves the release at /comunitate/.
// The public release pipeline must explicitly set INTENTRA_PUBLIC_BUILD=1.
const publicBuild = process.env.INTENTRA_PUBLIC_BUILD === '1';

export default defineConfig({
  base: publicBuild ? '/comunitate/' : './',
  build: { outDir: 'dist', emptyOutDir: true },
  server: { host: '127.0.0.1', strictPort: true },
});
