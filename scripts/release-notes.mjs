// Builds GitHub release notes for one version from its CHANGELOG.md section.
//
//   node scripts/release-notes.mjs 0.3.0          # or v0.3.0
//
// Prints Markdown to stdout. Exits with an error if CHANGELOG.md has no
// (or an empty) section for that version, so the publish workflow stops before
// publishing a release nobody has written up.
//
// CHANGELOG.md keeps the Keep a Changelog headings; release notes use
// reader-facing ones instead:
//   Added -> What's new, Changed -> Improvements, Fixed -> Bug fixes.
// Text between the version heading and its first `###` (e.g. an upgrade note)
// is kept at the top.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = 'oxth/nestjs-storage';
const PACKAGE = '@oxth/nestjs-storage';

// Output order. Headings not listed here keep their name and go last.
const SECTIONS = [
  { from: 'Added', to: "What's new" },
  { from: 'Changed', to: 'Improvements' },
  { from: 'Fixed', to: 'Bug fixes' },
  { from: 'Security', to: 'Security' },
  { from: 'Deprecated', to: 'Deprecated' },
  { from: 'Removed', to: 'Removed' },
  { from: 'Documentation', to: 'Documentation' },
];

const arg = process.argv[2];
if (!arg) {
  console.error('Usage: node scripts/release-notes.mjs <version>');
  process.exit(1);
}
const version = arg.replace(/^v/, '');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
const lines = changelog.split('\n');

const isVersionHeading = (line) => /^## \[/.test(line);
const isLinkReference = (line) => /^\[[^\]]+\]: /.test(line);
const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const start = lines.findIndex((line) =>
  new RegExp(`^## \\[${escaped}\\](\\s|$)`).test(line),
);
if (start === -1) {
  console.error(
    `CHANGELOG.md has no "## [${version}]" section. Move the [Unreleased] entries under it first (see CONTRIBUTING.md).`,
  );
  process.exit(1);
}

let end = lines.length;
for (let i = start + 1; i < lines.length; i++) {
  if (isVersionHeading(lines[i]) || isLinkReference(lines[i])) {
    end = i;
    break;
  }
}

// The next version heading below this one is the previous release.
const previous = lines
  .slice(start + 1)
  .find(isVersionHeading)
  ?.match(/^## \[([^\]]+)\]/)?.[1];

const preamble = [];
const sections = new Map();
let current = null;
for (const line of lines.slice(start + 1, end)) {
  const heading = line.match(/^### (.+?)\s*$/);
  if (heading) {
    current = heading[1];
    if (!sections.has(current)) sections.set(current, []);
    continue;
  }
  (current ? sections.get(current) : preamble).push(line);
}

const trim = (block) => block.join('\n').trim();
const known = new Set(SECTIONS.map((s) => s.from));
const ordered = [
  ...SECTIONS.filter((s) => sections.has(s.from)),
  ...[...sections.keys()]
    .filter((name) => !known.has(name))
    .map((name) => ({ from: name, to: name })),
];

const body = ordered
  .map(({ from, to }) => [to, trim(sections.get(from))])
  .filter(([, content]) => content)
  .map(([title, content]) => `## ${title}\n\n${content}`);

if (!body.length && !trim(preamble)) {
  console.error(`CHANGELOG.md's "## [${version}]" section is empty.`);
  process.exit(1);
}

// GitHub builds heading anchors by lowercasing, dropping punctuation other
// than "-" and turning spaces into "-": "## [0.3.0] - 2026-11-05" -> "030---2026-11-05".
const anchor = lines[start]
  .replace(/^## /, '')
  .toLowerCase()
  .replace(/[^\w\s-]/g, '')
  .replace(/\s/g, '-');
const links = [
  `[CHANGELOG.md](https://github.com/${REPO}/blob/main/CHANGELOG.md#${anchor})`,
];
if (previous && previous !== 'Unreleased') {
  links.push(
    `[v${previous}...v${version}](https://github.com/${REPO}/compare/v${previous}...v${version})`,
  );
}

const notes = [
  ['```bash', `npm install ${PACKAGE}@${version}`, '```'].join('\n'),
  trim(preamble),
  ...body,
  `**Full changelog:** ${links.join(' · ')}`,
]
  .filter(Boolean)
  .join('\n\n');

process.stdout.write(notes + '\n');
