import { type NextFunction, type Request, type Response } from 'express';

import type { CreateBed } from '../../../../Contexts/Agro/Beds/application/useCases/CreateBed.js';
import { HttpController } from '../../shared/HttpController.js';
import httpStatus from 'http-status';
import type { CreateBedDto } from '../../../../Contexts/Agro/Beds/application/useCases/interfaces/CreateBedDto.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { bedDomainMapper } from '../../../../Contexts/Agro/Beds/mappers/bedDomainMapper.js';

export type CreateBedControllerDependencies = {
  createBed: CreateBed;
};

export class CreateBedController extends HttpController {
  protected readonly createBed: CreateBed;
  constructor({ createBed }: CreateBedControllerDependencies) {
    super();
    this.createBed = createBed;
  }

  run = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = req.body as CreateBedDto;
      const user = res.locals.user as UserSessionInfo;

      const bed = await this.createBed.execute(
        { ...dto, userId: user.id },
        user.username
      );

      const response = bedDomainMapper.toPrimitives(bed);

      res.status(httpStatus.CREATED).json(response);
    } catch (error) {
      next(error);
    }
  };
}
