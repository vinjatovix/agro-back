import { envs } from '../../../../apps/agroApi/config/plugins/envs.plugin.js';
import type { MongoConfig } from './interfaces/MongoConfig.js';

const mongoConfig = {
  connection: envs.MONGO_CONNECTION,
  url: envs.MONGO_URL,
  db: envs.MONGO_DB,
  username: envs.MONGO_USERNAME,
  password: envs.MONGO_PASSWORD,
  appName: envs.MONGO_APP_NAME,
  replicaSet: envs.MONGO_REPLICA_SET
};

export class MongoConfigFactory {
  static createConfig(): MongoConfig {
    return {
      ...mongoConfig,
      connectionString: MongoConfigFactory.createMongoUri()
    };
  }

  static createMongoUri(): string {
    const { username, password, connection, url, db, appName, replicaSet } =
      mongoConfig;
    const encodedPassword = encodeURIComponent(password);
    const credentials =
      username && encodedPassword ? `${username}:${encodedPassword}@` : '';
    const baseConnectionString = `${connection}://${credentials}${url}/${db}`;

    if (connection === 'mongodb+srv') {
      return `${baseConnectionString}?retryWrites=true&w=majority&appName=${appName}`;
    }

    return replicaSet
      ? `${baseConnectionString}?replicaSet=${replicaSet}`
      : baseConnectionString;
  }
}
