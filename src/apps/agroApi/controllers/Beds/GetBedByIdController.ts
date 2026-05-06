import { type NextFunction, type Request, type Response } from 'express';

import { HttpController } from '../../shared/HttpController.js';
import { createError } from '../../../../shared/errors/index.js';
import type { GetBedById } from '../../../../Contexts/Agro/Beds/application/useCases/GetBedById.js';
import { bedDomainMapper } from '../../../../Contexts/Agro/Beds/mappers/bedDomainMapper.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';

export type GetBedByIdControllerDependencies = {
  getBedById: GetBedById;
};

export class GetBedByIdController extends HttpController {
  protected readonly getBedById: GetBedById;
  constructor({ getBedById }: GetBedByIdControllerDependencies) {
    super();
    this.getBedById = getBedById;
  }

  run = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bedId = req.params.id;
      const user = res.locals.user as UserSessionInfo;

      if (!bedId) {
        throw createError.badRequest('Bed ID is required');
      }

      const bed = await this.getBedById.execute(bedId, user);

      const response = bedDomainMapper.toPrimitives(bed);

      res.status(this.status()).json(response);
    } catch (error) {
      next(error);
    }
  };
}
