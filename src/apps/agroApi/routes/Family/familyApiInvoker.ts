import { makeInvoker } from 'awilix-express';
import type { CreateFamilyController } from '../../controllers/Families/CreateFamilyController.js';
import type { GetFamilyBySlugController } from '../../controllers/Families/GetFamilyByISlugController.js';

const api = ({
  createFamilyController,
  // updateFamilyController,
  // getAllFamiliesController,
  getFamilyBySlugController
  // deleteFamilyController
}: {
  createFamilyController: CreateFamilyController;
  getFamilyBySlugController: GetFamilyBySlugController;
}) => ({
  createFamily: createFamilyController.run,
  getFamilyBySlug: getFamilyBySlugController.run
});

export const familyApiInvoker = makeInvoker(api);
