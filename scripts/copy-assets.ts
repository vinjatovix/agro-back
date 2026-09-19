import { globSync } from 'glob';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function copyAssets(
  srcPattern = 'src/**/*.{yml,yaml}',
  destDir = 'dist'
): Promise<void> {
  const files = globSync(srcPattern);
  const log = process.env.NODE_ENV === 'test' ? () => {} : console.log;

  log(`[copy-assets] Found ${files.length} asset files to copy.`);

  for (const file of files) {
    const relativeFile = path.isAbsolute(file)
      ? path.relative(process.cwd(), file)
      : file;
    const dest = path.join(destDir, relativeFile);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(file, dest);
    log(`[copy-assets] Copied: ${file} -> ${dest}`);
  }

  log('[copy-assets] Asset copy completed successfully.');
}

const isMain = process.argv.slice(1, 3).some((arg) => {
  const resolved = arg ? path.resolve(arg) : '';
  return (
    resolved.endsWith('copy-assets.ts') || resolved.endsWith('copy-assets.js')
  );
});

if (isMain) {
  copyAssets().catch((error) => {
    console.error('[copy-assets] Error copying assets:', error);
    process.exit(1);
  });
}
