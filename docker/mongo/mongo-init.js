db = db.getSiblingDB('agro-api');
db.createUser({
  user: 'localUser',
  pwd: 'localPassword',
  roles: [{ role: 'readWrite', db: 'agro-api' }]
});

db = db.getSiblingDB('test');
db.createUser({
  user: 'localUser',
  pwd: 'localPassword',
  roles: [
    { role: 'readWrite', db: 'test' }
  ]
});
