import { copyAssets } from './copy-assets.js';

// Entry point kept apart from `copy-assets.ts`: Jest compiles the modules a
// test imports to CommonJS, where top-level `await` is not allowed.
try {
  await copyAssets();
} catch (error) {
  console.error('[copy-assets] Error copying assets:', error);
  process.exit(1);
}
