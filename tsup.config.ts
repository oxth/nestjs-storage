import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  tsconfig: 'tsconfig.build.json',
  dts: true,
  clean: true,
  sourcemap: true,
  outDir: 'dist',
  minify: true,
  treeshake: true,
  keepNames: true,
  target: 'node18',
});
