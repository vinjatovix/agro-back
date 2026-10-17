import dotenv from 'dotenv';
import env from 'env-var';

dotenv.config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
  override: true,
  quiet: true
});

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
  // Page that receives the activation link; one trailing `/` is dropped so
  // links never contain `//activate`.
  FRONTEND_BASE_URL: env
    .get('FRONTEND_BASE_URL')
    .required()
    .asUrlString()
    .replace(/\/$/, ''),
  // Only audience accepted in Google ID tokens; required like the frontend.
  GOOGLE_CLIENT_ID: env.get('GOOGLE_CLIENT_ID').required().asString(),
  // GitHub OAuth app credentials; required so the feature can never half-start.
  // The redirect URI is a server-side setting registered with the GitHub app;
  // the client never supplies it.
  GITHUB_CLIENT_ID: env.get('GITHUB_CLIENT_ID').required().asString(),
  GITHUB_CLIENT_SECRET: env.get('GITHUB_CLIENT_SECRET').required().asString(),
  GITHUB_REDIRECT_URI: env.get('GITHUB_REDIRECT_URI').required().asUrlString(),
  BCRYPT_SALT_ROUNDS: env
    .get('BCRYPT_SALT_ROUNDS')
    .default('12')
    .asIntPositive(),
  MAIL_FROM_ADDRESS: env.get('MAIL_FROM_ADDRESS').default('').asString(),
  MAIL_FROM_NAME: env.get('MAIL_FROM_NAME').default('').asString(),
  RESEND_API_KEY: env.get('RESEND_API_KEY').default('').asString(),
  MAIL_SEND_TIMEOUT_MS: env
    .get('MAIL_SEND_TIMEOUT_MS')
    .default('5000')
    .asIntPositive(),
  TEST_LOGS: env.get('TEST_LOGS').default('false').asBool()
};
