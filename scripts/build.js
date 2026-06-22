import fs from 'fs';
import path from 'path';
import { build } from 'esbuild';

const SRC = path.resolve('src');
const OUT = path.resolve('build');

function log(...s) { console.log('[build]', ...s); }

// Clean output
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

// Copy source to build dir
log('Copying files...');
fs.cpSync(SRC, OUT, { recursive: true });

// Ensure background dir exists
const outBg = path.join(OUT, 'background');
fs.mkdirSync(outBg, { recursive: true });

// Bundle ES module service worker
log('Bundling ES module service worker...');
await build({
  entryPoints: [path.join(SRC, 'background', 'index.js')],
  outfile: path.join(outBg, 'background.mjs'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  sourcemap: false,
  legalComments: 'none',
});

// Bundle legacy IIFE background script for Firefox fallback
log('Bundling legacy IIFE background script...');
await build({
  entryPoints: [path.join(SRC, 'background', 'index.js')],
  outfile: path.join(outBg, 'background.legacy.js'),
  bundle: true,
  format: 'iife',
  globalName: 'BackgroundLegacy',
  platform: 'browser',
  sourcemap: false,
  legalComments: 'none',
});

// Patch manifest in build to point to the built files
const manifestPath = path.join(OUT, 'manifest.json');
log('Patching manifest:', manifestPath);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.background = manifest.background || {};
manifest.background.service_worker = 'background/background.mjs';
manifest.background.scripts = ['background/background.legacy.js'];
manifest.background.type = 'module';
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

log('Build complete.');
