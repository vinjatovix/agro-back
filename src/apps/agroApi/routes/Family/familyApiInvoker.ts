import { makeInvoker } from 'awilix-express';
import type { CreateFamilyController } from '../../controllers/Families/CreateFamilyController.js';

const api = ({
  createFamilyController
  // updateFamilyController,
  // getAllFamiliesController,
  // getFamilyByIdController,
  // deleteFamilyController
}: {
  createFamilyController: CreateFamilyController;
}) => ({
  createFamily: createFamilyController.run
});

export const familyApiInvoker = makeInvoker(api);
