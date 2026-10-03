import { MongoClient } from 'mongodb';
import { EnvironmentArranger } from '../../arranger/EnvironmentArranger.js';

export type MongoEnvironmentArrangerDependencies = {
  DBClient: MongoClient;
};

export class MongoEnvironmentArranger extends EnvironmentArranger {
  private readonly DBClient: MongoClient;

  constructor({ DBClient }: MongoEnvironmentArrangerDependencies) {
    super();
    this.DBClient = DBClient;
  }

  public async arrange(): Promise<void> {
    await this.cleanDatabase();
  }

  public async close(): Promise<void> {
    await this.client().close();
  }

  private async collections(): Promise<string[]> {
    const client = this.client();
    const collections = await client
      .db()
      .listCollections(undefined, { nameOnly: true })
      .toArray();

    return collections.map((collection) => collection.name);
  }

  protected client(): MongoClient {
    return this.DBClient;
  }

  protected async cleanDatabase(): Promise<void> {
    const collections = await this.collections();
    const client = this.client();

    for (const collection of collections) {
      await client.db().collection(collection).deleteMany({});
    }
  }
}
