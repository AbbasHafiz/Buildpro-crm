// Copies the static web app (single-source in the repo root) into:
//   ./www     — Capacitor Android bundle
//   ./public  — Wasmer Edge + Cloudflare Workers static assets
//   ./docs    — GitHub Pages (repo Pages source is /docs)
// Keeps index.html as the single source of truth.
import { mkdirSync, copyFileSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILES = ['index.html', 'sw.js', 'manifest.json', 'icon-192.png', 'icon-512.png'];
const EXTRA = { public: ['_headers'], docs: [] };
const TARGETS = ['www', 'public', 'docs'];

for (const f of FILES) {
  if (!existsSync(join(root, f))) {
    console.error('Missing web asset:', f);
    process.exit(1);
  }
}

for (const dir of TARGETS) {
  const dest = join(root, dir);
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  for (const f of FILES) {
    copyFileSync(join(root, f), join(dest, f));
  }
  for (const f of (EXTRA[dir] || [])) {
    const src = join(root, f);
    if (existsSync(src)) copyFileSync(src, join(dest, f));
  }
  // GitHub Pages: disable Jekyll so _headers / dotfiles aren't stripped
  if (dir === 'docs') writeFileSync(join(dest, '.nojekyll'), '');
}

console.log('Copied web assets to', TARGETS.map(t => t + '/').join(' '), ':', FILES.join(', '));
