import type { Router } from 'express';
import { globSync } from 'glob';

export function registerRoutes(router: Router): void {
  const routeFiles = globSync('./src/apps/backend/routes/**/*.routes.ts', {
    absolute: true,
    ignore: ['./src/apps/backend/routes/index.ts']
  }).map((file: string) => file.replace(/\\/g, '/')); // Normaliza las rutas para Windows

  interface RouteModule {
    registerRoutes?: (router: Router) => void;
  }

  routeFiles.forEach((file: string): void => {
    import(file)
      .then((module: RouteModule) => {
        if (module.registerRoutes) {
          module.registerRoutes(router);
        } else {
          console.warn(
            `El archivo ${file} no exporta una función registerRoutes`
          );
        }
      })
      .catch((err: Error): void => {
        console.error(`Error al cargar el archivo de rutas ${file}:`, err);
      });
  });
}
