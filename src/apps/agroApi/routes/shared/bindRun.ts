import type { RequestHandler } from 'express';

export const bindRun = <T extends { run: RequestHandler }>(controller: T): RequestHandler =>
  controller.run.bind(controller);
