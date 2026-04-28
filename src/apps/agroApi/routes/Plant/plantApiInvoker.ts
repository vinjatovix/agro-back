import { makeInvoker } from 'awilix-express';
import { bindRun } from '../shared/bindRun.js';
import {
  CreatePlantController,
  GetPlantByIdController,
  GetAllPlantsController
} from '../../controllers/Plants/index.js';

const api = (
  createPlantController: CreatePlantController,
  getAllPlantsController: GetAllPlantsController,
  getPlantController: GetPlantByIdController
) => {
  return {
    createPlant: bindRun(createPlantController),
    getAllPlants: bindRun(getAllPlantsController),
    getPlantById: bindRun(getPlantController)
  };
};

export const plantApiInvoker = makeInvoker(api);
