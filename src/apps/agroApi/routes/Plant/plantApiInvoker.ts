import { makeInvoker } from 'awilix-express';
import { bindRun } from '../shared/bindRun.js';
import {
  CreatePlantController,
  GetPlantByIdController,
  GetAllPlantsController
} from '../../controllers/Plants/index.js';
import type { UpdatePlantController } from '../../controllers/Plants/UpdatePlantController.js';

const api = (
  createPlantController: CreatePlantController,
  getAllPlantsController: GetAllPlantsController,
  getPlantController: GetPlantByIdController,
  updatePlantController: UpdatePlantController
) => {
  return {
    createPlant: bindRun(createPlantController),
    getAllPlants: bindRun(getAllPlantsController),
    getPlantById: bindRun(getPlantController),
    updatePlant: bindRun(updatePlantController)
  };
};

export const plantApiInvoker = makeInvoker(api);
