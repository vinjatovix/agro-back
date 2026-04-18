import { globSync } from 'glob';
import type { RouteModule } from '../src/apps/agroApi/routes/route.types.js';
import { getRegisterRouteOrThrow } from '../src/apps/agroApi/routes/routeModuleValidation.js';

const ROUTE_FILES_GLOB = './src/apps/agroApi/routes/**/*.routes.ts';

const toUnixPath = (file: string): string => file.replaceAll('\\', '/');   

const routeFiles = globSync(ROUTE_FILES_GLOB, { absolute: true }).map(
  toUnixPath
);

if (routeFiles.length === 0) {
  console.error(
    `[validate-routes] No route files found with pattern: ${ROUTE_FILES_GLOB}`
  );
  process.exit(1);
}

for (const file of routeFiles) {
  const module = (await import(file)) as RouteModule;

  try {
    getRegisterRouteOrThrow(module, file);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[validate-routes] ${message}`);
    process.exit(1);
  }
}

console.log(
  `[validate-routes] OK (${routeFiles.length} route modules validated)`
);
