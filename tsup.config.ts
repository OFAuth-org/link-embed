import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true,
  dts: true,
  entry: ['src/embed.ts'],
  format: ['cjs', 'esm', 'iife'],
});
