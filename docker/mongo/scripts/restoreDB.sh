#!/bin/bash

# Command line arguments
ENV_DUMP=$1
DUMP_DB=$2
DUMP_USER=$3
PASSWORD=$4

# Required variables
DOCKER_NAME=agro-api-mongo
RESTORE_HOST=localhost
RESTORE_PORT=27017
RESTORE_USER=root
RESTORE_PASSWORD=rootPassword

# Enables error propagation
set -e

print() {
  local message="$1"
  printf "\n\n\n# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #\n%s\n# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #\n\n\n" "$message"
  return 0
}   

if [[ $ENV_DUMP == "PRO" && $PASSWORD ]]; then
  HOST=
  DUMP_USER=
elif [[ $ENV_DUMP == "PREINT" && $PASSWORD ]]; then
  HOST=
elif [[ $ENV_DUMP == "PRE" && $PASSWORD ]]; then
  HOST=
elif [[ $ENV_DUMP == "DES" && $PASSWORD ]]; then
  HOST=cluster0.cmeym.mongodb.net
else
  printf "\nEnvironment and password are required"
  printf "\n\nUsage: npm run restoreDB [ENVIRONMENT] [DUMP_DB] [DUMP_USER] [PASSWORD]"
  printf "\n  ENVIRONMENT: DES, PRE o PREINT."
  printf "\n  DUMP_DB: database to restore."
  printf "\n  DUMP_USER: user of the chosen environment."
  printf "\n  PASSWORD: password of the chosen environment."
  printf '\n\nExample: npm run restoreDB DES apiHuerta labrego "SDGFAOSD324"'
  exit 1
fi


docker exec -it "$DOCKER_NAME" mongodump --uri="mongodb+srv://$DUMP_USER:$PASSWORD@$HOST" --db "$DUMP_DB" --out "/data/dump/$ENV_DUMP"
print "                 $ENV_DUMP dump completed"
sleep 1

print "      Dropping existing collections in local database $DUMP_DB"
docker exec -it "$DOCKER_NAME" mongosh --host "$RESTORE_HOST" --port "$RESTORE_PORT" --username "$RESTORE_USER" --password "$RESTORE_PASSWORD" --eval "use $DUMP_DB" --eval "db.dropDatabase()"

sleep 1

print "        Restoring $ENV_DUMP dump to local database $DUMP_DB"

docker exec -it "$DOCKER_NAME" mongorestore --host "$RESTORE_HOST" --port "$RESTORE_PORT" --username "$RESTORE_USER" --password "$RESTORE_PASSWORD" --drop "/data/dump/$ENV_DUMP"

docker restart "$DOCKER_NAME"

print "                 $ENV_DUMP restore completed"

exit 0
