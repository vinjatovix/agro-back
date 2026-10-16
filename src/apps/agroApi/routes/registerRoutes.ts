import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Router } from 'express';
import { globSync } from 'glob';
import type { RouteModule } from './route.types.js';
import { getRegisterRouteOrThrow } from './routeModuleValidation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROUTES_BASE = path.resolve(__dirname, '../routes');

const ROUTE_FILES_GLOB = path.join(ROUTES_BASE, '**/*.routes.{ts,js}');

const CURRENT_FILE_GLOB = path.join(ROUTES_BASE, 'registerRoutes.{ts,js}');

const WINDOWS_PATH_SEPARATOR_REGEX = /\\/g;

const toUnixPath = (file: string): string =>
  file.replaceAll(WINDOWS_PATH_SEPARATOR_REGEX, '/');

const loadRouteFiles = (): string[] =>
  globSync(ROUTE_FILES_GLOB, {
    absolute: true,
    ignore: [CURRENT_FILE_GLOB]
  }).map(toUnixPath);

const reportFailure = (file: string, err: unknown): never => {
  console.error(`Failed to load route file ${file}:`, err);
  throw err;
};

const importRouteModule = async (
  file: string
): Promise<Partial<RouteModule>> => {
  try {
    return (await import(file)) as Partial<RouteModule>;
  } catch (err) {
    return reportFailure(file, err);
  }
};

export async function registerRoutes(router: Router): Promise<void> {
  const files = loadRouteFiles();
  // Modules load concurrently; routes are registered in file order, which
  // Express matching depends on.
  const modules = await Promise.all(files.map(importRouteModule));

  files.forEach((file, index) => {
    try {
      getRegisterRouteOrThrow(modules[index] ?? {}, file)(router);
    } catch (err) {
      reportFailure(file, err);
    }
  });
}
