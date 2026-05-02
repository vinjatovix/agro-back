import { type NextFunction, type Request, type Response } from 'express';

import { HttpController } from '../../shared/HttpController.js';
import { createError } from '../../../../shared/errors/index.js';
import type { GetBedById } from '../../../../Contexts/Agro/Beds/application/useCases/GetBedById.js';
import { bedMapper } from '../../../../Contexts/Agro/Beds/mappers/bedMapper.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';

export class GetBedByIdController extends HttpController {
  constructor(private readonly getBedById: GetBedById) {
    super();
  }

  async run(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const bedId = req.params.id;
      const user = res.locals.user as UserSessionInfo;

      if (!bedId) {
        throw createError.badRequest('Bed ID is required');
      }

      const bed = await this.getBedById.execute(bedId, user);

      res.status(this.status()).json(bedMapper.toPrimitives(bed));
    } catch (error) {
      next(error);
    }
  }
}
