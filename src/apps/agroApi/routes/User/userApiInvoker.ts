import { makeInvoker } from 'awilix-express';
import type { ChangeUserRolesController } from '../../controllers/Users/ChangeUserRolesController.js';
import type { LookupUserController } from '../../controllers/Users/LookupUserController.js';

const api = ({
  changeUserRolesController,
  lookupUserController
}: {
  changeUserRolesController: ChangeUserRolesController;
  lookupUserController: LookupUserController;
}) => ({
  changeUserRoles: changeUserRolesController.run,
  lookupUser: lookupUserController.run
});

export const userApiInvoker = makeInvoker(api);
