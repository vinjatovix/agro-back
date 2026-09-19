import type { Router } from 'express';

export type RegisterRoutes = (router: Router) => void;

export interface RouteModule {
  registerRoutes: RegisterRoutes;
}
