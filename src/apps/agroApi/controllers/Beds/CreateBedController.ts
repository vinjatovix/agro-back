import { type NextFunction, type Request, type Response } from 'express';

import type { CreateBed } from '../../../../Contexts/Agro/Beds/application/useCases/CreateBed.js';
import { HttpController } from '../../shared/HttpController.js';
import httpStatus from 'http-status';
import type { CreateBedDto } from '../../../../Contexts/Agro/Beds/application/useCases/interfaces/CreateBedDto.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { bedMapper } from '../../../../Contexts/Agro/Beds/mappers/bedMapper.js';

export class CreateBedController extends HttpController {
  constructor(private readonly createBed: CreateBed) {
    super();
  }

  async run(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = req.body as CreateBedDto;
      const user = res.locals.user as UserSessionInfo;

      const bed = await this.createBed.execute(
        { ...dto, userId: user.id },
        user.username
      );

      res.status(httpStatus.CREATED).json(bedMapper.toPrimitives(bed));
    } catch (error) {
      next(error);
    }
  }
}
