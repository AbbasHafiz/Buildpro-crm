// Copies the static web app (single-source in the repo root) into ./www,
// which Capacitor bundles into the Android app. Keeps index.html as the single source of truth.
import { mkdirSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const www = join(root, 'www');

const FILES = ['index.html', 'sw.js', 'manifest.json', 'icon-192.png', 'icon-512.png'];

rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });

for (const f of FILES) {
  const src = join(root, f);
  if (!existsSync(src)) { console.error('Missing web asset:', f); process.exit(1); }
  copyFileSync(src, join(www, f));
}

console.log('Copied web assets to www/:', FILES.join(', '));
