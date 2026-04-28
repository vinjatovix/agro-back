import { type NextFunction, type Request, type Response } from 'express';

import type { GetPlant } from '../../../../Contexts/Agro/Plants/application/useCases/GetPlant.js';
import { HttpController } from '../../shared/HttpController.js';
import { createError } from '../../../../shared/errors/index.js';

export class GetPlantController extends HttpController {
  constructor(private useCase: GetPlant) {
    super();
  }

  async run(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plantId = req.params.id;

      if (!plantId) {
        throw createError.badRequest('Plant ID is required');
      }

      const plant = await this.useCase.execute(plantId);

      res.status(this.status()).json(plant);
    } catch (error) {
      next(error);
    }
  }
}
