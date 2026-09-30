import { type NextFunction, type Request, type Response } from 'express';
import type {
  UpdatePasswordLocal,
  UserSessionInfo
} from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { updatePasswordRequest } from './requestSchemas.js';

export type UpdatePasswordLocalControllerDependencies = {
  updatePassword: UpdatePasswordLocal;
};

export class UpdatePasswordLocalController extends HttpController {
  protected readonly updatePassword: UpdatePasswordLocal;
  constructor({ updatePassword }: UpdatePasswordLocalControllerDependencies) {
    super();
    this.updatePassword = updatePassword;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { body } = getValidatedRequest(res, updatePasswordRequest);
      const user = res.locals.user as UserSessionInfo;

      await this.updatePassword.run(body, user);

      res.status(this.status()).json({ message: 'User updated successfully' });
    } catch (error) {
      next(error);
    }
  };
}
