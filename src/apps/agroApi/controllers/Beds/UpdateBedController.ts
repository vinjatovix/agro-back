import { type NextFunction, type Request, type Response } from 'express';

import { HttpController } from '../../shared/HttpController.js';
import type { UpdateBed } from '../../../../Contexts/Agro/Beds/application/useCases/UpdateBed.js';
import type { UpdateBedDto } from '../../../../Contexts/Agro/Beds/application/useCases/interfaces/UpdateBedDto.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { bedMapper } from '../../../../Contexts/Agro/Beds/mappers/bedMapper.js';
import { createError } from '../../../../shared/errors/index.js';

export class UpdateBedController extends HttpController {
  constructor(private readonly updateBed: UpdateBed) {
    super();
  }

  async run(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw createError.badRequest('Missing id param');
      }
      const dto = req.body as UpdateBedDto;

      const user = res.locals.user as UserSessionInfo;

      const result = await this.updateBed.execute(
        { ...dto, id },
        user.username
      );

      res.status(this.status()).json(bedMapper.toPrimitives(result));
    } catch (error) {
      next(error);
    }
  }
}
