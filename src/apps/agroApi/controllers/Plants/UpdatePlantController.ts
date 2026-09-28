import { type NextFunction, type Request, type Response } from 'express';

import type { UpdatePlantDto } from '../../../../Contexts/Agro/Plants/application/useCases/interfaces/UpdatePlantDto.js';
import type { UpdatePlant } from '../../../../Contexts/Agro/Plants/application/useCases/UpdatePlant.js';
import { plantDomainMapper } from '../../../../Contexts/Agro/Plants/mappers/plantDomainMapper.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { createError } from '../../../../shared/errors/index.js';
import { getExpectedVersion } from '../../middlewares/requireIfMatch.js';
import { HttpController } from '../../shared/HttpController.js';
import { setVersionETag } from '../../shared/setVersionETag.js';

export type UpdatePlantControllerDependencies = {
  updatePlant: UpdatePlant;
};

export class UpdatePlantController extends HttpController {
  protected readonly updatePlant: UpdatePlant;
  constructor({ updatePlant }: UpdatePlantControllerDependencies) {
    super();
    this.updatePlant = updatePlant;
  }

  run = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!id) {
        throw createError.badRequest('Plant ID is required');
      }
      const dto = req.body as UpdatePlantDto;

      const user = res.locals.user as UserSessionInfo;

      const result = await this.updatePlant.execute(
        { ...dto, id },
        user.username,
        getExpectedVersion(res)
      );
      const mappedResult = plantDomainMapper.toPrimitives(result);

      setVersionETag(res, mappedResult.version);
      res.status(this.status()).json(mappedResult);
    } catch (error) {
      next(error);
    }
  };
}
