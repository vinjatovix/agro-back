import { type NextFunction, type Request, type Response } from 'express';

import type { UpdateBedDto } from '../../../../Contexts/Agro/Beds/application/useCases/interfaces/UpdateBedDto.js';
import type { UpdateBedInput } from '../../../../Contexts/Agro/Beds/application/useCases/interfaces/UpdateBedInput.js';
import type { UpdateBed } from '../../../../Contexts/Agro/Beds/application/useCases/UpdateBed.js';
import { bedDomainMapper } from '../../../../Contexts/Agro/Beds/mappers/bedDomainMapper.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { createError } from '../../../../shared/errors/index.js';
import { getExpectedVersion } from '../../middlewares/requireIfMatch.js';
import { HttpController } from '../../shared/HttpController.js';
import { setVersionETag } from '../../shared/setVersionETag.js';

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

      const result = await this.updateBed.execute(
        input,
        user,
        getExpectedVersion(res)
      );

      const response = bedDomainMapper.toPrimitives(result);

      setVersionETag(res, response.version);
      res.status(this.status()).json(response);
    } catch (error) {
      next(error);
    }
  };
}
