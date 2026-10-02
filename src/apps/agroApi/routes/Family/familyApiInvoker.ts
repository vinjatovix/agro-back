import { makeInvoker } from 'awilix-express';
import type {
  CreateFamilyController,
  GetAllFamiliesController,
  GetFamilyBySlugController,
  UpdateFamilyController
} from '../../controllers/Families/index.js';

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
