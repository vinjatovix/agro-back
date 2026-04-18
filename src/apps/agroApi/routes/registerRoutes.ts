import type { Router } from 'express';
import { globSync } from 'glob';
import type { RouteModule } from './route.types.js';
import { getRegisterRouteOrThrow } from './routeModuleValidation.js';

const ROUTE_FILES_GLOB = './src/apps/agroApi/routes/**/*.routes.ts';
const CURRENT_FILE_GLOB = './src/apps/agroApi/routes/registerRoutes.ts';
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
