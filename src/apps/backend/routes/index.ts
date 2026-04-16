import type { Router } from 'express';
import { globSync } from 'glob';

export async function registerRoutes(router: Router): Promise<void> {
  const routeFiles = globSync('./src/apps/backend/routes/**/*.routes.ts', {
    absolute: true,
    ignore: ['./src/apps/backend/routes/index.ts']
  }).map((file: string) => file.replace(/\\/g, '/')); // Normaliza las rutas para Windows

  interface RouteModule {
    registerRoutes?: (router: Router) => void;
  }

  for (const file of routeFiles) {
    try {
      const module: RouteModule = await import(file);
      if (module.registerRoutes) {
        module.registerRoutes(router);
      } else {
        console.warn(`El archivo ${file} no exporta registerRoutes`);
      }
    } catch (err) {
      console.error(`Error al cargar rutas ${file}:`, err);
    }
  }
}
