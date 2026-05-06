import { makeInvoker } from 'awilix-express';
import {
  CreatePlantController,
  GetPlantByIdController,
  GetAllPlantsController,
  UpdatePlantController,
  DeletePlantController
} from '../../controllers/Plants/index.js';

const api = ({
  createPlantController,
  getAllPlantsController,
  getPlantController,
  updatePlantController,
  deletePlantController
}: {
  createPlantController: CreatePlantController;
  getAllPlantsController: GetAllPlantsController;
  getPlantController: GetPlantByIdController;
  updatePlantController: UpdatePlantController;
  deletePlantController: DeletePlantController;
}) => {
  return {
    createPlant: createPlantController.run,
    getAllPlants: getAllPlantsController.run,
    getPlantById: getPlantController.run,
    updatePlant: updatePlantController.run,
    deletePlant: deletePlantController.run
  };
};

export const plantApiInvoker = makeInvoker(api);
