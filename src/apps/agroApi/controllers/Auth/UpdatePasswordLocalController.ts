import { type NextFunction, type Request, type Response } from 'express';
import type {
  UpdatePasswordLocal,
  UpdatePasswordRequest,
  UserSessionInfo
} from '../../../../Contexts/Auth/application/index.js';
import { HttpController } from '../../shared/HttpController.js';

export type UpdatePasswordLocalControllerDependencies = {
  updatePassword: UpdatePasswordLocal;
};

export class UpdatePasswordLocalController extends HttpController {
  protected readonly updatePassword: UpdatePasswordLocal;
  constructor({ updatePassword }: UpdatePasswordLocalControllerDependencies) {
    super();
    this.updatePassword = updatePassword;
  }

  run = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const request = req.body as UpdatePasswordRequest;
      const user = res.locals.user as UserSessionInfo;

      await this.updatePassword.run(request, user);

      res.status(this.status()).json({ message: 'User updated successfully' });
    } catch (error) {
      next(error);
    }
  };
}
