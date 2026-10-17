// Build-time checks import application modules that read the runtime config
// when loaded. The build (e.g. `docker build`) has no runtime variables, and
// these checks never connect or serve, so each required variable that is not
// set gets a placeholder. Real values, when present, win.
const PLACEHOLDERS: Readonly<Record<string, string>> = {
  PORT: '3000',
  HOST: 'localhost',
  NODE_ENV: 'production',
  ALLOWED_ORIGINS: 'http://localhost',
  MONGO_CONNECTION: 'mongodb',
  MONGO_URL: 'localhost:27017',
  MONGO_APP_NAME: 'build',
  MONGO_DB: 'build',
  MONGO_USERNAME: 'build',
  MONGO_PASSWORD: 'build',
  MONGO_REPLICA_SET: 'build',
  JWT_SECRET: 'build',
  FRONTEND_BASE_URL: 'http://localhost',
  GOOGLE_CLIENT_ID: 'build',
  GITHUB_CLIENT_ID: 'build',
  GITHUB_CLIENT_SECRET: 'build',
  GITHUB_REDIRECT_URI: 'http://localhost'
};

for (const [name, value] of Object.entries(PLACEHOLDERS)) {
  process.env[name] ??= value;
}
