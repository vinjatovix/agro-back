import fs from 'node:fs/promises';
import path from 'node:path';
import { globSync } from 'glob';

export async function copyAssets(
  srcPattern = 'src/**/*.{yml,yaml}',
  destDir = 'dist'
): Promise<void> {
  const files = globSync(srcPattern);
  const log = process.env.NODE_ENV === 'test' ? () => {} : console.log;

  log(`[copy-assets] Found ${files.length} asset files to copy.`);

  const copies = await Promise.all(
    files.map(async (file) => {
      const relativeFile = path.isAbsolute(file)
        ? path.relative(process.cwd(), file)
        : file;
      const dest = path.join(destDir, relativeFile);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.copyFile(file, dest);
      return { file, dest };
    })
  );

  for (const { file, dest } of copies) {
    log(`[copy-assets] Copied: ${file} -> ${dest}`);
  }

  log('[copy-assets] Asset copy completed successfully.');
}
