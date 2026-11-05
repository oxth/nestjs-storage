// Regenerates the docs site's raster brand assets from their sources:
//
//   docs/public/favicon.svg        (the logo — edit this one by hand)
//   scripts/brand/og-image.html    (the 1200x630 social preview card)
//
// into docs/public/: logo.png, apple-touch-icon.png, favicon.ico, og-image.png.
//
// No npm dependencies: it drives a locally installed Chrome/Chromium in
// headless mode. Set CHROME_PATH if it isn't found automatically.
// Run with `pnpm brand:build`, then commit the regenerated files.
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const publicDir = join(root, 'docs/public');
const logoSvg = join(publicDir, 'favicon.svg');
const ogHtml = join(root, 'scripts/brand/og-image.html');

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
];

const chrome = CHROME_CANDIDATES.find((p) => p && existsSync(p));
if (!chrome) {
  console.error(
    'Chrome/Chromium not found. Set CHROME_PATH to its executable.',
  );
  process.exit(1);
}

const tmp = mkdtempSync(join(tmpdir(), 'nestjs-storage-brand-'));

function screenshot(source, out, width, height, { transparent = false } = {}) {
  execFileSync(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      // Gives the page time to load web fonts before capturing.
      '--virtual-time-budget=5000',
      ...(transparent ? ['--default-background-color=00000000'] : []),
      `--window-size=${width},${height}`,
      `--screenshot=${out}`,
      pathToFileURL(source).href,
    ],
    { stdio: 'ignore' },
  );
}

// An .ico file can hold PNG images directly: a 6-byte header, a 16-byte
// directory entry per image, then the PNG bytes.
function writeIco(out, pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(pngs.length, 4);

  let offset = 6 + 16 * pngs.length;
  const entries = pngs.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 means 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });

  writeFileSync(
    out,
    Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]),
  );
}

try {
  screenshot(logoSvg, join(publicDir, 'logo.png'), 256, 256, {
    transparent: true,
  });

  // iOS rounds the corners itself, so the touch icon needs a full-bleed square.
  const squareSvg = join(tmp, 'square.svg');
  writeFileSync(
    squareSvg,
    readFileSync(logoSvg, 'utf8').replace(/ rx="15"/, ''),
  );
  screenshot(squareSvg, join(publicDir, 'apple-touch-icon.png'), 180, 180);

  const icoImages = [16, 32, 48].map((size) => {
    const png = join(tmp, `icon-${size}.png`);
    screenshot(logoSvg, png, size, size, { transparent: true });
    return { size, data: readFileSync(png) };
  });
  writeIco(join(publicDir, 'favicon.ico'), icoImages);

  screenshot(ogHtml, join(publicDir, 'og-image.png'), 1200, 630);

  console.log('Brand assets written to docs/public/');
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
