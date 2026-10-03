db = db.getSiblingDB('agro');
db.createUser({
  user: 'localUser',
  pwd: 'localPassword',
  roles: [{ role: 'readWrite', db: 'agro' }]
});

// Jest gives each worker its own database (`test-1`, `test-2`…) so parallel
// suites never wipe each other's data; the test user may write to all of them.
const JEST_WORKER_DATABASES = 16;

db = db.getSiblingDB('test');
db.createUser({
  user: 'localUser',
  pwd: 'localPassword',
  roles: [
    { role: 'readWrite', db: 'test' },
    ...Array.from({ length: JEST_WORKER_DATABASES }, (_, index) => ({
      role: 'readWrite',
      db: `test-${index + 1}`
    }))
  ]
});
