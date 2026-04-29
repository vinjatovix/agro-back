import { makeInvoker } from 'awilix-express';
import { bindRun } from '../shared/bindRun.js';
import {
  CreatePlantController,
  GetPlantByIdController,
  GetAllPlantsController,
  UpdatePlantController,
  DeletePlantController
} from '../../controllers/Plants/index.js';

const api = (
  createPlantController: CreatePlantController,
  getAllPlantsController: GetAllPlantsController,
  getPlantController: GetPlantByIdController,
  updatePlantController: UpdatePlantController,
  deletePlantController: DeletePlantController
) => {
  return {
    createPlant: bindRun(createPlantController),
    getAllPlants: bindRun(getAllPlantsController),
    getPlantById: bindRun(getPlantController),
    updatePlant: bindRun(updatePlantController),
    deletePlant: bindRun(deletePlantController)
  };
};

export const plantApiInvoker = makeInvoker(api);
