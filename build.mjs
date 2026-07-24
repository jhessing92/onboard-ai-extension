// Build script: bundles the three entry points into dist/ and copies public/.
// Usage: node build.mjs [--watch]
import * as esbuild from 'esbuild';
import { cpSync, rmSync, mkdirSync } from 'node:fs';

const watch = process.argv.includes('--watch');

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });
cpSync('public', 'dist', { recursive: true });

const common = {
  bundle: true,
  target: 'chrome120',
  sourcemap: false,
  logLevel: 'info',
};

// Background is an ES module ("type": "module" in the manifest); content and
// options scripts are classic scripts, so bundle them as IIFEs.
const configs = [
  { ...common, entryPoints: { background: 'src/background.ts' }, format: 'esm', outdir: 'dist' },
  {
    ...common,
    entryPoints: { content: 'src/content/index.ts', options: 'src/options/options.ts' },
    format: 'iife',
    outdir: 'dist',
  },
];

if (watch) {
  const contexts = await Promise.all(configs.map((c) => esbuild.context(c)));
  await Promise.all(contexts.map((c) => c.watch()));
  console.log('watching…');
} else {
  await Promise.all(configs.map((c) => esbuild.build(c)));
}
