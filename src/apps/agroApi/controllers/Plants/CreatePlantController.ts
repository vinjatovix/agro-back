import { type NextFunction, type Request, type Response } from 'express';

import httpStatus from 'http-status';
import type { CreatePlant } from '../../../../Contexts/Agro/Plants/application/useCases/CreatePlant.js';
import type { CreatePlantDto } from '../../../../Contexts/Agro/Plants/application/useCases/interfaces/CreatePlantDto.js';
import { plantDomainMapper } from '../../../../Contexts/Agro/Plants/mappers/plantDomainMapper.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { HttpController } from '../../shared/HttpController.js';
import { setVersionETag } from '../../shared/setVersionETag.js';

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

      setVersionETag(res, result.version);
      res.status(httpStatus.CREATED).json(result);
    } catch (error) {
      next(error);
    }
  };
}
