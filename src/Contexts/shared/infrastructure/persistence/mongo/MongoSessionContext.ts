import { AsyncLocalStorage } from 'node:async_hooks';
import type { ClientSession } from 'mongodb';

// Scoped to one async call chain, so concurrent requests never share a
// session. Only `MongoUnitOfWork` opens it and `MongoRepository` reads it.
const sessionStorage = new AsyncLocalStorage<ClientSession>();

export function runWithSession<T>(
  session: ClientSession,
  fn: () => Promise<T>
): Promise<T> {
  return sessionStorage.run(session, fn);
}

export function currentSession(): ClientSession | undefined {
  return sessionStorage.getStore();
}
