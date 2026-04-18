import type { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';

export abstract class HttpController {
  abstract run(req: Request, res: Response, next: NextFunction): Promise<void>;

  protected status(): number {
    return httpStatus.OK;
  }
}