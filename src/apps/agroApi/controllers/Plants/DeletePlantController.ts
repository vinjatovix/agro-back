import { type NextFunction, type Request, type Response } from 'express';

import type { DeletePlant } from '../../../../Contexts/Agro/Plants/application/useCases/DeletePlant.js';
import { createError } from '../../../../shared/errors/index.js';
import { HttpController } from '../../shared/HttpController.js';
import httpStatus from 'http-status';

export class DeletePlantController extends HttpController {
  constructor(private readonly deletePlant: DeletePlant) {
    super();
  }

  async run(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plantId = req.params.id;

      if (!plantId) {
        throw createError.badRequest('Plant ID is required');
      }

      await this.deletePlant.execute(plantId);

      res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
      next(error);
    }
  }
}
