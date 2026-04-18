import type { RouteModule } from './route.types.js';

const ROUTE_REGISTER_EXPORT = 'registerRoutes';

export const getRegisterRouteOrThrow = (
  module: Partial<RouteModule>,
  file: string
): RouteModule['registerRoutes'] => {
  const registerRoute = module[ROUTE_REGISTER_EXPORT];

  if (typeof registerRoute !== 'function') {
    throw new Error(
      `Route file ${file} must export a function named ${ROUTE_REGISTER_EXPORT}`
    );
  }

  return registerRoute;
};
