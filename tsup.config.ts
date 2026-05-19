import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    minify: false,
  },
  {
    entry: { 'tracker.min': 'src/script-entry.ts' },
    format: ['iife'],
    globalName: 'HeatmapTracker',
    minify: true,
    sourcemap: true,
    outExtension: () => ({ js: '.js' }),
  },
]);
