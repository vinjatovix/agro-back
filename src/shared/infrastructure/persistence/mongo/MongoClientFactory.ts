import { UUID } from 'bson';
import { MongoClient } from 'mongodb';

import type { IndexConfig, MongoConfig } from './interfaces/index.js';
import { INDEXES } from './MongoCollectionIndexes.js';

export class MongoClientFactory {
  private static clients: Record<string, MongoClient> = {};

  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_INTERVAL_MS = 5000;

  static async createClient(
    contextName: string,
    config: MongoConfig
  ): Promise<MongoClient> {
    let client = MongoClientFactory.getClient(contextName);

    if (!client) {
      client = await MongoClientFactory.createAndConnectClient(config);

      MongoClientFactory.registerClient(client, contextName);

      await MongoClientFactory.ensureIndexes(client, config.db, INDEXES);
    }

    return client;
  }

  private static getClient(contextName: string): MongoClient | null {
    return MongoClientFactory.clients[contextName] ?? null;
  }

  private static async createAndConnectClient(
    config: MongoConfig,
    attempt = 1
  ): Promise<MongoClient> {
    if (!config.connectionString) {
      throw new Error(
        `MongoClientFactory: connectionString is missing in config: ${JSON.stringify(config)}`
      );
    }

    const isTesting =
      process.env.NODE_ENV === 'test' ||
      process.env.JEST_WORKER_ID !== undefined;

    if (isTesting && config.connectionString.includes('mongodb.net')) {
      throw new Error(
        'MongoClientFactory: Connecting to Mongo Atlas (mongodb.net) in a test environment is strictly forbidden to prevent accidental data loss.'
      );
    }

    try {
      const client = new MongoClient(config.connectionString, {
        ignoreUndefined: true,
        pkFactory: {
          createPk: () => new UUID().toBinary()
        }
      });

      await client.connect();
      console.info('MongoDB client connected successfully');

      return client;
    } catch (error) {
      if (attempt < MongoClientFactory.MAX_RETRIES) {
        console.warn(
          `MongoDB connection failed (attempt ${attempt}/${MongoClientFactory.MAX_RETRIES}). Retrying in ${MongoClientFactory.RETRY_INTERVAL_MS / 1000}s...`
        );
        await new Promise((resolve) =>
          setTimeout(resolve, MongoClientFactory.RETRY_INTERVAL_MS)
        );
        return MongoClientFactory.createAndConnectClient(config, attempt + 1);
      }

      console.error(
        `MongoDB connection failed after ${MongoClientFactory.MAX_RETRIES} attempts:`,
        error
      );
      throw error;
    }
  }

  private static registerClient(
    client: MongoClient,
    contextName: string
  ): void {
    MongoClientFactory.clients[contextName] = client;
  }

  static async closeClient(contextName: string): Promise<void> {
    const client = MongoClientFactory.getClient(contextName);
    if (client) {
      await client.close();
    }
  }

  private static async ensureIndexes(
    client: MongoClient,
    dbName: string,
    indexConfigs: IndexConfig[]
  ): Promise<void> {
    const db = client.db(dbName);

    await Promise.all(
      indexConfigs.flatMap(({ collection, indexes }) =>
        indexes.map(async ({ fields, options }) => {
          try {
            await db.collection(collection).createIndex(fields, options);
            console.info(
              `Mongo index ensured: ${collection} ${JSON.stringify(fields)}`
            );
          } catch (error) {
            console.error(
              `Error creating index in ${collection}: ${JSON.stringify(fields)}`,
              error
            );

            throw error;
          }
        })
      )
    );
  }
}
