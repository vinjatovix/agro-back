import { type NextFunction, type Request, type Response } from 'express';
import type {
  UpdatePasswordLocal,
  UpdatePasswordRequest,
  UserSessionInfo
} from '../../../../Contexts/agroApi/Auth/application/index.js';
import { HttpController } from '../../shared/controllers/HttpController.js';

export class UpdatePasswordLocalController extends HttpController {
  constructor(protected readonly updatePassword: UpdatePasswordLocal) {
    super();
  }

  async run(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const request = req.body as UpdatePasswordRequest;
      const user = res.locals.user as UserSessionInfo;

      await this.updatePassword.run(request, user);

      res.status(this.status()).json({ message: 'User updated successfully' });
    } catch (error) {
      next(error);
    }
  }
}
