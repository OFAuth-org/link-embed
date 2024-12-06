import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true,
  dts: false,
  sourcemap: false,
  treeshake: true,
  splitting: true,
  entry: ["src/embed.ts", "src/component.ts"],
  format: ["cjs", "esm", "iife"]
});
