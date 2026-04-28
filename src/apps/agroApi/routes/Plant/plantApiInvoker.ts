import { makeInvoker } from 'awilix-express';
import { CreatePlant } from '../../../../Contexts/Agro/Plants/application/useCases/CreatePlant.js';
import { bindRun } from '../shared/bindRun.js';
import { CreatePlantController } from '../../controllers/Plants/CreatePlantController.js';
import type { GetPlant } from '../../../../Contexts/Agro/Plants/application/useCases/GetPlant.js';
import { GetPlantController } from '../../controllers/Plants/GetPlantController.js';

const api = (createPlant: CreatePlant, getPlant: GetPlant) => {
  const createPlantCtrl = new CreatePlantController(createPlant);
  const getPlantByIdCtrl = new GetPlantController(getPlant);

  return {
    createPlant: bindRun(createPlantCtrl),
    getPlantById: bindRun(getPlantByIdCtrl)
  };
};

export const plantApiInvoker = makeInvoker(api);
