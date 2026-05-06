import { type NextFunction, type Request, type Response } from 'express';

import type { ListUserBeds } from '../../../../Contexts/Agro/Beds/application/useCases/ListUserBeds.js';
import { HttpController } from '../../shared/HttpController.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { bedDomainMapper } from '../../../../Contexts/Agro/Beds/mappers/bedDomainMapper.js';

export type GetUserBedsControllerDependencies = {
  listUserBeds: ListUserBeds;
};

export class GetUserBedsController extends HttpController {
  protected readonly listUserBeds: ListUserBeds;
  constructor({ listUserBeds }: GetUserBedsControllerDependencies) {
    super();
    this.listUserBeds = listUserBeds;
  }

  run = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = res.locals.user as UserSessionInfo;
      const beds = await this.listUserBeds.execute(user.id);

      const response = beds.map((bed) => bedDomainMapper.toPrimitives(bed));

      res.status(this.status()).json(response);
    } catch (error) {
      next(error);
    }
  };
}
