import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/**/*.ts', '!src/**/*.spec.ts'],
  format: ['cjs', 'esm'],
  tsconfig: 'tsconfig.build.json',
  dts: true,
  clean: true,
  sourcemap: true,
  outDir: 'dist',
  bundle: false,
  treeshake: false,
  keepNames: true,
  target: 'node18',
});
