import { type NextFunction, type Request, type Response } from 'express';

import type { CreatePlant } from '../../../../Contexts/agroApi/agro/plants/application/useCases/CreatePlant.js';
import type { CreatePlantDto } from '../../../../Contexts/agroApi/agro/plants/application/useCases/interfaces/CreatePlantDto.js';
import { HttpController } from '../../shared/controllers/HttpController.js';
import type { UserSessionInfo } from '../../../../Contexts/agroApi/Auth/application/index.js';
import httpStatus from 'http-status';
import { plantMapper } from '../../../../Contexts/agroApi/agro/plants/mappers/plantMapper.js';

export class CreatePlantController extends HttpController {
  constructor(private useCase: CreatePlant) {
    super();
  }

  async run(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = req.body as CreatePlantDto;
      const user = res.locals.user as UserSessionInfo;

      const plant = await this.useCase.execute(dto, user.username);
      const result = plantMapper.toPrimitives(plant);

      res.status(httpStatus.CREATED).json(result);
    } catch (error) {
      next(error);
    }
  }
}
