// tsup (unbundled) emits ESM output whose relative import/export/dynamic-import
// specifiers are copied verbatim from the TypeScript source: either missing an
// extension (`from './constants'`), pointing at a directory barrel
// (`from './drivers'`), or hardcoded to `.js` for nodenext's sake
// (`import('./drivers/s3.driver.js')`). Real Node ESM requires the exact
// filename, and the actual sibling files here are `.mjs`. This rewrites every
// relative specifier in the emitted `.mjs` files to the real `.mjs` file.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { glob } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const SPECIFIER_PATTERN = /(from\s+|import\()(['"])(\.\.?\/[^'"]*?)\2/g;

function resolveSpecifier(fileDir, specifier) {
  if (specifier.endsWith('.mjs')) return specifier;

  const withoutJsExt = specifier.replace(/\.js$/, '');
  const asFile = join(fileDir, `${withoutJsExt}.mjs`);
  if (existsSync(asFile)) return `${withoutJsExt}.mjs`;

  const asIndex = join(fileDir, withoutJsExt, 'index.mjs');
  if (existsSync(asIndex)) {
    return `${withoutJsExt}/index.mjs`.replace(/^(?!\.)/, './');
  }

  throw new Error(`Cannot resolve "${specifier}" from ${fileDir}`);
}

const files = await Array.fromAsync(glob('dist/**/*.mjs'));

let changed = 0;
for (const file of files) {
  const fileDir = dirname(file);
  const original = readFileSync(file, 'utf8');
  const fixed = original.replace(
    SPECIFIER_PATTERN,
    (match, prefix, quote, path) =>
      `${prefix}${quote}${resolveSpecifier(fileDir, path)}${quote}`,
  );
  if (fixed !== original) {
    writeFileSync(file, fixed);
    changed += 1;
  }
}

console.log(`fix-esm-extensions: rewrote ${changed}/${files.length} .mjs files`);
