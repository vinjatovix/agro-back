import { readFileSync } from 'node:fs';

import { config, database, up as migrationUp } from 'migrate-mongo';

import migrations, { buildMigrationsConfig } from '../../migrations/index.js';

jest.mock('node:fs', () => {
  const actual = jest.requireActual<typeof import('node:fs')>('node:fs');

  return { ...actual, readFileSync: jest.fn(actual.readFileSync) };
});

jest.mock('migrate-mongo', () => ({
  config: { set: jest.fn() },
  database: { connect: jest.fn() },
  up: jest.fn()
}));

jest.mock('../../src/Contexts/shared/plugins/logger.plugin.js', () => ({
  buildLogger: () => ({ info: jest.fn(), error: jest.fn() })
}));

const VERSION_PATTERN = /\d+\.\d+\.\d+/;

describe('migrations runner', () => {
  describe('buildMigrationsConfig', () => {
    it('should read every migration from one folder and take the lock', () => {
      // Act
      const result = buildMigrationsConfig('mongodb://example:27017/db');

      // Assert
      expect(result).toStrictEqual({
        mongodb: { url: 'mongodb://example:27017/db' },
        migrationsDir: 'migrations/scripts',
        changelogCollectionName: 'changelog',
        lockCollectionName: 'changelog_lock',
        lockTtl: 300
      });
    });

    it('should not depend on the application version', () => {
      // Act
      const { migrationsDir } = buildMigrationsConfig('mongodb://example');

      // Assert
      expect(migrationsDir).not.toMatch(VERSION_PATTERN);
      expect(jest.mocked(readFileSync)).not.toHaveBeenCalledWith(
        expect.stringContaining('package.json'),
        expect.anything()
      );
    });

    it('should be the config handed to migrate-mongo on import', () => {
      // Assert
      expect(jest.mocked(config.set)).toHaveBeenCalledWith(
        expect.objectContaining({
          migrationsDir: 'migrations/scripts',
          lockCollectionName: 'changelog_lock'
        })
      );
    });
  });

  describe('up', () => {
    const close = jest.fn();

    beforeEach(() => {
      close.mockReset();
      close.mockResolvedValue(undefined);
      jest.mocked(database.connect).mockResolvedValue({
        db: {},
        client: { close }
      } as unknown as Awaited<ReturnType<typeof database.connect>>);
    });

    it('should close the client and rethrow when a lock is in place', async () => {
      // Arrange
      jest
        .mocked(migrationUp)
        .mockRejectedValueOnce(
          new Error('Could not migrate up, a lock is in place.')
        );

      // Act
      const result = migrations.up();

      // Assert
      await expect(result).rejects.toThrow(/lock/);
      expect(close).toHaveBeenCalledTimes(1);
    });

    it('should close the client after applying the pending migrations', async () => {
      // Arrange
      jest.mocked(migrationUp).mockResolvedValueOnce(['a.js']);

      // Act
      await migrations.up();

      // Assert
      expect(close).toHaveBeenCalledTimes(1);
    });

    it('should not abort start-up when closing the client fails', async () => {
      // Arrange
      jest.mocked(migrationUp).mockResolvedValueOnce(['a.js']);
      close.mockRejectedValueOnce(new Error('close failed'));

      // Act
      const result = migrations.up();

      // Assert
      await expect(result).resolves.toBeUndefined();
    });

    it('should rethrow the migration error when closing the client also fails', async () => {
      // Arrange
      jest
        .mocked(migrationUp)
        .mockRejectedValueOnce(
          new Error('Could not migrate up, a lock is in place.')
        );
      close.mockRejectedValueOnce(new Error('close failed'));

      // Act
      const result = migrations.up();

      // Assert
      await expect(result).rejects.toThrow(/lock/);
    });
  });
});
