import { type NextFunction, type Request, type Response } from 'express';
import { HttpController } from '../../shared/HttpController.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import httpStatus from 'http-status';
import type { DeleteBed } from '../../../../Contexts/Agro/Beds/application/useCases/DeleteBed.js';
import { createError } from '../../../../shared/errors/index.js';

export class DeleteBedController extends HttpController {
  constructor(private readonly deleteBed: DeleteBed) {
    super();
  }

  async run(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = res.locals.user as UserSessionInfo;

      if (!id) {
        throw createError.badRequest('Bed ID is required');
      }

      await this.deleteBed.execute(id, user);

      res.status(httpStatus.NO_CONTENT).end();
    } catch (error) {
      next(error);
    }
  }
}
