import { makeInvoker } from 'awilix-express';
import { bindRun } from '../shared/bindRun.js';
import {
  CreatePlantController,
  GetPlantByIdController
} from '../../controllers/Plants/index.js';

const api = (
  createPlantController: CreatePlantController,
  getPlantController: GetPlantByIdController
) => {
  return {
    createPlant: bindRun(createPlantController),
    getPlantById: bindRun(getPlantController)
  };
};

export const plantApiInvoker = makeInvoker(api);
