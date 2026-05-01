import { type NextFunction, type Request, type Response } from 'express';

import type { CreatePlant } from '../../../../Contexts/Agro/Plants/application/useCases/CreatePlant.js';
import type { CreatePlantDto } from '../../../../Contexts/Agro/Plants/application/useCases/interfaces/CreatePlantDto.js';
import { HttpController } from '../../shared/HttpController.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import httpStatus from 'http-status';
import { plantMapper } from '../../../../Contexts/Agro/Plants/mappers/plantMapper.js';

export class CreatePlantController extends HttpController {
  constructor(private readonly createPlant: CreatePlant) {
    super();
  }

  async run(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = req.body as CreatePlantDto;
      const user = res.locals.user as UserSessionInfo;

      const plant = await this.createPlant.execute(dto, user.username);
      const result = plantMapper.toPrimitives(plant);

      res.status(httpStatus.CREATED).json(result);
    } catch (error) {
      next(error);
    }
  }
}
