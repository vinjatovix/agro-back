import { type NextFunction, type Request, type Response } from 'express';

import type { GetPlant } from '../../../../Contexts/Agro/Plants/application/useCases/GetPlant.js';
import { HttpController } from '../../shared/HttpController.js';
import { createError } from '../../../../shared/errors/index.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';

export class GetPlantByIdController extends HttpController {
  constructor(private readonly getPlant: GetPlant) {
    super();
  }

  async run(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plantId = req.params.id;
      const user = res.locals.user as UserSessionInfo;

      if (!plantId) {
        throw createError.badRequest('Plant ID is required');
      }

      const plant = await this.getPlant.execute(plantId, user);

      res.status(this.status()).json(plant);
    } catch (error) {
      next(error);
    }
  }
}
