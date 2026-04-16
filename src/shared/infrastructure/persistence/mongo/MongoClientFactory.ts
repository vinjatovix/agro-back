import { UUID } from 'bson';
import { MongoClient, MongoServerError } from 'mongodb';
import type { MongoConfig } from './MongoConfig.js';
import { INDEXES } from './MongoCollectionIndexes.js';

interface IndexConfig {
  collection: string;
  indexes: string[][];
}

export class MongoClientFactory {
  private static clients: { [key: string]: MongoClient } = {};

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

  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_INTERVAL_MS = 5000;

  private static async createAndConnectClient(
    config: MongoConfig,
    attempt = 1
  ): Promise<MongoClient> {
    if (!config?.connectionString) {
      throw new Error(
        `MongoClientFactory: connectionString is missing in config: ${JSON.stringify(config)}`
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
  ) {
    const db = client.db(dbName);

    await Promise.all(
      indexConfigs.flatMap(({ collection, indexes }) =>
        indexes.map(async (fieldsArray) => {
          const fields = Object.fromEntries(
            fieldsArray.map((field) => [field, 1])
          );

          try {
            await db
              .collection(collection)
              .createIndex(fields, { unique: true });
          } catch (error: unknown) {
            if ((error as MongoServerError).code !== 11000) {
              console.error(
                `Error creating index in ${collection}: ${JSON.stringify(fields)}`,
                error
              );

              throw error;
            }
          }
        })
      )
    );
  }
}
