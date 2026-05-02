import { type NextFunction, type Request, type Response } from 'express';

import { HttpController } from '../../shared/HttpController.js';
import type { UpdatePlant } from '../../../../Contexts/Agro/Plants/application/useCases/UpdatePlant.js';
import type { UpdatePlantDto } from '../../../../Contexts/Agro/Plants/application/useCases/interfaces/UpdatePlantDto.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { createError } from '../../../../shared/errors/index.js';
import { plantMapper } from '../../../../Contexts/Agro/Plants/mappers/plantMapper.js';

export class UpdatePlantController extends HttpController {
  constructor(private readonly updatePlant: UpdatePlant) {
    super();
  }

  async run(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const dto = req.body as UpdatePlantDto;
      if (id !== dto.id) {
        throw createError.badRequest('ID in params does not match ID in body');
      }

      const user = res.locals.user as UserSessionInfo;

      const result = await this.updatePlant.execute(dto, user.username);
      const mappedResult = plantMapper.toPrimitives(result);

      res.status(this.status()).json(mappedResult);
    } catch (error) {
      next(error);
    }
  }
}
