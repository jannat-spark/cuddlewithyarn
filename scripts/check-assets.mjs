/**
 * Static asset reference check.
 *
 *   node scripts/check-assets.mjs
 *
 * Every `/media`, `/brand` and `/sequences` path written as a literal in `src/`
 * is resolved against `public/`. A typo in one of those strings renders as a
 * broken image that looks like a styling problem rather than a data problem, so
 * this catches it before a deploy does. Tokenised paths such as
 * `/sequences/hero/{w}/f_0001.webp` are produced by the build and skipped.
 */
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(p)));
    else if (/\.(tsx?|css|mjs)$/.test(entry.name)) out.push(p);
  }
  return out;
}

const QUOTE = String.fromCharCode(39);
const BACKTICK = String.fromCharCode(96);
const DQUOTE = String.fromCharCode(34);
const pattern = new RegExp(
  `[${QUOTE}${DQUOTE}${BACKTICK}](\\/(?:media|brand|sequences)\\/[^${QUOTE}${DQUOTE}${BACKTICK}\\s]+)[${QUOTE}${DQUOTE}${BACKTICK}]`,
  'g',
);

const refs = new Map();
for (const file of await walk('src')) {
  const src = await readFile(file, 'utf8');
  for (const match of src.matchAll(pattern)) {
    const url = match[1];
    if (!refs.has(url)) refs.set(url, new Set());
    refs.get(url).add(path.relative('.', file));
  }
}

let missing = 0;
for (const [url, where] of [...refs].sort()) {
  if (url.includes('{')) continue;
  if (!existsSync(path.join('public', url))) {
    missing += 1;
    console.log('MISSING', url, '<-', [...where].join(', '));
  }
}
console.log(missing === 0 ? `all ${refs.size} static asset references resolve` : `${missing} missing`);
process.exit(missing === 0 ? 0 : 1);