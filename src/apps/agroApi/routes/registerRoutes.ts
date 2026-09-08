import type { Router } from 'express';
import { globSync } from 'glob';
import type { RouteModule } from './route.types.js';
import { getRegisterRouteOrThrow } from './routeModuleValidation.js';

import { fileURLToPath } from 'node:url';
import path from 'node:path';

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

export async function registerRoutes(router: Router): Promise<void> {
  for (const file of loadRouteFiles()) {
    try {
      const module = (await import(file)) as Partial<RouteModule>;
      const registerRoute = getRegisterRouteOrThrow(module, file);

      registerRoute(router);
    } catch (err) {
      console.error(`Failed to load route file ${file}:`, err);
      throw err;
    }
  }
}
