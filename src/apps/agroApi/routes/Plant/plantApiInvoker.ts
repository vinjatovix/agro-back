import { makeInvoker } from 'awilix-express';
import { CreatePlant } from '../../../../Contexts/Agro/Plants/application/useCases/CreatePlant.js';
import { bindRun } from '../shared/bindRun.js';
import { CreatePlantController } from '../../controllers/Plants/CreatePlantController.js';

const api = (createPlant: CreatePlant) => {
  const createPlantCtrl = new CreatePlantController(createPlant);

  return {
    createPlant: bindRun(createPlantCtrl)
  };
};

export const plantApiInvoker = makeInvoker(api);
