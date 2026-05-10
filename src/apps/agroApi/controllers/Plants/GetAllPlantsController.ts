import { type NextFunction, type Request, type Response } from 'express';

import { HttpController } from '../../shared/HttpController.js';
import type { ListPlants } from '../../../../Contexts/Agro/Plants/application/useCases/ListPlants.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { plantDomainMapper } from '../../../../Contexts/Agro/Plants/mappers/plantDomainMapper.js';
import type { PlantQueryParser } from '../../../../Contexts/Agro/Plants/application/query/PlantQueryParser.js';

export type GetAllPlantsControllerDependencies = {
  listPlants: ListPlants;
  plantQueryParser: PlantQueryParser;
};

export class GetAllPlantsController extends HttpController {
  protected readonly listPlants: ListPlants;
  protected readonly parser: PlantQueryParser;

  constructor({
    listPlants,
    plantQueryParser
  }: GetAllPlantsControllerDependencies) {
    super();
    this.listPlants = listPlants;
    this.parser = plantQueryParser;
  }

  run = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = res.locals.user as UserSessionInfo | null;
      const dto = this.parser.parse(req.query);
      const result = await this.listPlants.execute(user, dto);
      const data = result.data.map((plant) =>
        plantDomainMapper.toPrimitives(plant)
      );

      res.status(this.status()).json({ ...result, data });
    } catch (error) {
      next(error);
    }
  };
}
