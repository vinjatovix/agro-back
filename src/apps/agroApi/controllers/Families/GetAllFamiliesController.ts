import { type NextFunction, type Request, type Response } from 'express';

import { ListFamilies } from '../../../../Contexts/Agro/Families/application/useCases/ListFamilies.js';
import { familyDomainMapper } from '../../../../Contexts/Agro/Families/mappers/familyDomainMapper.js';
import { HttpController } from '../../shared/HttpController.js';
import { FamilyQueryParser } from '../../../../Contexts/Agro/Families/application/query/FamilyQueryParser.js';

export type GetAllFamiliesControllerDependencies = {
  listFamilies: ListFamilies;
  familyQueryParser: FamilyQueryParser;
};

export class GetAllFamiliesController extends HttpController {
  protected readonly listFamilies: ListFamilies;
  private readonly parser: FamilyQueryParser;

  constructor({
    listFamilies,
    familyQueryParser
  }: GetAllFamiliesControllerDependencies) {
    super();
    this.listFamilies = listFamilies;
    this.parser = familyQueryParser;
  }

  run = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = this.parser.parse(req.query);

      const result = await this.listFamilies.execute(dto);
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
