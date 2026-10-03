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
  getPlantByIdController,
  updatePlantController,
  deletePlantController
}: {
  createPlantController: CreatePlantController;
  getAllPlantsController: GetAllPlantsController;
  getPlantByIdController: GetPlantByIdController;
  updatePlantController: UpdatePlantController;
  deletePlantController: DeletePlantController;
}) => {
  return {
    createPlant: createPlantController.run,
    getAllPlants: getAllPlantsController.run,
    getPlantById: getPlantByIdController.run,
    updatePlant: updatePlantController.run,
    deletePlant: deletePlantController.run
  };
};

export const plantApiInvoker = makeInvoker(api);
