import { type NextFunction, type Request, type Response } from 'express';

import { ListFamilies } from '../../../../Contexts/Agro/Families/application/useCases/ListFamilies.js';
import { familyDomainMapper } from '../../../../Contexts/Agro/Families/mappers/familyDomainMapper.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { listFamiliesRequest } from './requestSchemas.js';

export type GetAllFamiliesControllerDependencies = {
  listFamilies: ListFamilies;
};

export class GetAllFamiliesController extends HttpController {
  protected readonly listFamilies: ListFamilies;

  constructor({ listFamilies }: GetAllFamiliesControllerDependencies) {
    super();
    this.listFamilies = listFamilies;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { query } = getValidatedRequest(res, listFamiliesRequest);

      const result = await this.listFamilies.execute({ query });
      const data = result.data.map((family) =>
        familyDomainMapper.toPrimitives(family)
      );

      res.status(this.status()).json({
        ...result,
        data
      });
    } catch (error) {
      next(error);
    }
  };
}
