import { defineConfig } from 'tsup';

export default defineConfig([
  {
    clean: true,
    dts: true,
    sourcemap: false,
    treeshake: true,
    splitting: false,
    entry: ['src/embed.ts'],
    format: ['cjs', 'esm', 'iife'],
  },
  {
    sourcemap: false,
    dts: true,
    treeshake: true,
    entry: ['src/component.ts'],
    format: ['cjs', 'esm'],
  },
]);
