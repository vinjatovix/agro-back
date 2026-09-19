import fs from 'node:fs/promises';
import path from 'node:path';
import { copyAssets } from '../../scripts/copy-assets.js';

describe('copy-assets script', () => {
  const testSrcDir = path.resolve('tests/scripts/test-src');
  const testDestDir = path.resolve('tests/scripts/test-dist');

  beforeEach(async () => {
    await fs.rm(testSrcDir, { recursive: true, force: true });
    await fs.rm(testDestDir, { recursive: true, force: true });
    await fs.mkdir(testSrcDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testSrcDir, { recursive: true, force: true });
    await fs.rm(testDestDir, { recursive: true, force: true });
  });

  it('should copy a yaml file in the root source directory', async () => {
    const file1 = path.join(testSrcDir, 'file1.yaml');
    await fs.writeFile(file1, 'content1');
    const srcPattern = 'tests/scripts/test-src/**/*.{yml,yaml}';

    await copyAssets(srcPattern, testDestDir);

    const copiedFile1 = path.join(
      testDestDir,
      'tests/scripts/test-src/file1.yaml'
    );
    await expect(fs.readFile(copiedFile1, 'utf8')).resolves.toBe('content1');
  });

  it('should copy a yml file from a nested source directory recursively', async () => {
    const folder1 = path.join(testSrcDir, 'folder1');
    await fs.mkdir(folder1, { recursive: true });
    const file2 = path.join(folder1, 'file2.yml');
    await fs.writeFile(file2, 'content2');
    const srcPattern = 'tests/scripts/test-src/**/*.{yml,yaml}';

    await copyAssets(srcPattern, testDestDir);

    const copiedFile2 = path.join(
      testDestDir,
      'tests/scripts/test-src/folder1/file2.yml'
    );
    await expect(fs.readFile(copiedFile2, 'utf8')).resolves.toBe('content2');
  });

  it('should ignore files that do not match the glob pattern', async () => {
    const file3 = path.join(testSrcDir, 'ignored.json');
    await fs.writeFile(file3, 'content3');
    const srcPattern = 'tests/scripts/test-src/**/*.{yml,yaml}';

    await copyAssets(srcPattern, testDestDir);

    const ignoredFile = path.join(
      testDestDir,
      'tests/scripts/test-src/ignored.json'
    );
    await expect(fs.access(ignoredFile)).rejects.toThrow();
  });
});
