db = db.getSiblingDB('agro');
db.createUser({
  user: 'localUser',
  pwd: 'localPassword',
  roles: [{ role: 'readWrite', db: 'agro' }]
});

db = db.getSiblingDB('test');
db.createUser({
  user: 'localUser',
  pwd: 'localPassword',
  roles: [{ role: 'readWrite', db: 'test' }]
});
