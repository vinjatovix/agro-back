import { makeInvoker } from 'awilix-express';
import type {
  CreateFamilyController,
  GetAllFamiliesController,
  GetFamilyBySlugController
} from '../../controllers/Families/index.js';
import type { UpdateFamilyController } from '../../controllers/Families/UpdateFamilyController.js';

const api = ({
  createFamilyController,
  updateFamilyController,
  getAllFamiliesController,
  getFamilyBySlugController
  // deleteFamilyController
}: {
  createFamilyController: CreateFamilyController;
  updateFamilyController: UpdateFamilyController;
  getAllFamiliesController: GetAllFamiliesController;
  getFamilyBySlugController: GetFamilyBySlugController;
}) => ({
  createFamily: createFamilyController.run,
  updateFamily: updateFamilyController.run,
  getAllFamilies: getAllFamiliesController.run,
  getFamilyBySlug: getFamilyBySlugController.run
});

export const familyApiInvoker = makeInvoker(api);
