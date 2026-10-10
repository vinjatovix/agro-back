import { makeInvoker } from 'awilix-express';
import type { GetPlantInstanceByIdController } from '../../controllers/PlantInstances/GetPlantInstanceByIdController.js';
import type { ListPlantInstancesController } from '../../controllers/PlantInstances/ListPlantInstancesController.js';
import type { PlacePlantInstanceController } from '../../controllers/PlantInstances/PlacePlantInstanceController.js';
import type { RemovePlantInstanceController } from '../../controllers/PlantInstances/RemovePlantInstanceController.js';
import type { UpdatePlantInstanceController } from '../../controllers/PlantInstances/UpdatePlantInstanceController.js';

const api = ({
  placePlantInstanceController,
  getPlantInstanceByIdController,
  listPlantInstancesController,
  updatePlantInstanceController,
  removePlantInstanceController
}: {
  placePlantInstanceController: PlacePlantInstanceController;
  getPlantInstanceByIdController: GetPlantInstanceByIdController;
  listPlantInstancesController: ListPlantInstancesController;
  updatePlantInstanceController: UpdatePlantInstanceController;
  removePlantInstanceController: RemovePlantInstanceController;
}) => ({
  placePlantInstance: placePlantInstanceController.run,
  getPlantInstanceById: getPlantInstanceByIdController.run,
  listPlantInstances: listPlantInstancesController.run,
  updatePlantInstance: updatePlantInstanceController.run,
  removePlantInstance: removePlantInstanceController.run
});

export const plantInstanceApiInvoker = makeInvoker(api);
