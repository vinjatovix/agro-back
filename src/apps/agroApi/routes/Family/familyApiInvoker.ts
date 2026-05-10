import { makeInvoker } from 'awilix-express';
import type {
  CreateFamilyController,
  GetAllFamiliesController,
  GetFamilyBySlugController
} from '../../controllers/Families/index.js';

const api = ({
  createFamilyController,
  // updateFamilyController,
  getAllFamiliesController,
  getFamilyBySlugController
  // deleteFamilyController
}: {
  createFamilyController: CreateFamilyController;
  getAllFamiliesController: GetAllFamiliesController;
  getFamilyBySlugController: GetFamilyBySlugController;
}) => ({
  createFamily: createFamilyController.run,
  getAllFamilies: getAllFamiliesController.run,
  getFamilyBySlug: getFamilyBySlugController.run
});

export const familyApiInvoker = makeInvoker(api);
