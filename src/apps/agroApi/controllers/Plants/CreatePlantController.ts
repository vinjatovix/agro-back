import { type NextFunction, type Request, type Response } from 'express';

import type { CreatePlant } from '../../../../Contexts/Agro/Plants/application/useCases/CreatePlant.js';
import type { CreatePlantDto } from '../../../../Contexts/Agro/Plants/application/useCases/interfaces/CreatePlantDto.js';
import { HttpController } from '../../shared/HttpController.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import httpStatus from 'http-status';
import { plantDomainMapper } from '../../../../Contexts/Agro/Plants/mappers/plantDomainMapper.js';

export type CreatePlantControllerDependencies = {
  createPlant: CreatePlant;
};

export class CreatePlantController extends HttpController {
  protected readonly createPlant: CreatePlant;
  constructor({ createPlant }: CreatePlantControllerDependencies) {
    super();
    this.createPlant = createPlant;
  }

  run = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = req.body as CreatePlantDto;
      const user = res.locals.user as UserSessionInfo;

      const plant = await this.createPlant.execute(dto, user.username);
      const result = plantDomainMapper.toPrimitives(plant);

      res.status(httpStatus.CREATED).json(result);
    } catch (error) {
      next(error);
    }
  };
}
