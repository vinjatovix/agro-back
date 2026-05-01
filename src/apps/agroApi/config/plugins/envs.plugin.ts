import 'dotenv/config';
import env from 'env-var';

export const envs = {
  PORT: env.get('PORT').required().asPortNumber(),
  HOST: env.get('HOST').required().asString(),
  NODE_ENV: env.get('NODE_ENV').required().asString(),
  ALLOWED_ORIGINS: env.get('ALLOWED_ORIGINS').required().asString(),
  JSON_BODY_LIMIT: env.get('JSON_BODY_LIMIT').default('1mb').asString(),
  URL_ENCODED_BODY_LIMIT: env
    .get('URL_ENCODED_BODY_LIMIT')
    .default('1mb')
    .asString(),
  REQUEST_TIMEOUT_MS: env
    .get('REQUEST_TIMEOUT_MS')
    .default('30000')
    .asIntPositive(),
  HEADERS_TIMEOUT_MS: env
    .get('HEADERS_TIMEOUT_MS')
    .default('35000')
    .asIntPositive(),
  KEEP_ALIVE_TIMEOUT_MS: env
    .get('KEEP_ALIVE_TIMEOUT_MS')
    .default('5000')
    .asIntPositive(),
  MONGO_CONNECTION: env.get('MONGO_CONNECTION').required().asString(),
  MONGO_URL: env.get('MONGO_URL').required().asString(),
  MONGO_APP_NAME: env.get('MONGO_APP_NAME').required().asString(),
  MONGO_DB: env.get('MONGO_DB').required().asString(),
  MONGO_USERNAME: env.get('MONGO_USERNAME').required().asString(),
  MONGO_PASSWORD: env.get('MONGO_PASSWORD').required().asString(),
  MONGO_REPLICA_SET: env.get('MONGO_REPLICA_SET').required().asString(),
  JWT_SECRET: env.get('JWT_SECRET').required().asString(),
  JWT_DEFAULT_DURATION: env
    .get('JWT_DEFAULT_DURATION')
    .default('2h')
    .asString(),
  GOOGLE_CLIENT_ID: env.get('GOOGLE_CLIENT_ID').default('').asString(),
  BCRYPT_SALT_ROUNDS: env
    .get('BCRYPT_SALT_ROUNDS')
    .default('12')
    .asIntPositive()
};
