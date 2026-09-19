import { type NextFunction, type Request, type Response } from 'express';

import { HttpController } from '../../shared/HttpController.js';
import type { UpdateBed } from '../../../../Contexts/Agro/Beds/application/useCases/UpdateBed.js';
import type { UpdateBedDto } from '../../../../Contexts/Agro/Beds/application/useCases/interfaces/UpdateBedDto.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { bedDomainMapper } from '../../../../Contexts/Agro/Beds/mappers/bedDomainMapper.js';
import { createError } from '../../../../shared/errors/index.js';
import { bedApiMapper } from '../../../../Contexts/Agro/Beds/mappers/bedApiMapper.js';
import type { UpdateBedInput } from '../../../../Contexts/Agro/Beds/application/useCases/interfaces/UpdateBedInput.js';

export type UpdateBedControllerDependencies = {
  updateBed: UpdateBed;
};

export class UpdateBedController extends HttpController {
  protected readonly updateBed: UpdateBed;
  constructor({ updateBed }: UpdateBedControllerDependencies) {
    super();
    this.updateBed = updateBed;
  }

  run = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!id) {
        throw createError.badRequest('Missing id param');
      }
      const dto = req.body as UpdateBedDto;
      const user = res.locals.user as UserSessionInfo;
      const input: UpdateBedInput = { ...dto, id };
      const patch = bedApiMapper.fromUpdateInputToPrimitivesPatch(input);

      const result = await this.updateBed.execute(patch, user);

      const response = bedDomainMapper.toPrimitives(result);

      res.status(this.status()).json(response);
    } catch (error) {
      next(error);
    }
  };
}
