import { makeInvoker } from 'awilix-express';
import { CreatePlant } from '../../../../Contexts/agroApi/agro/plants/application/useCases/CreatePlant.js';
import { CreatePlantController } from '../../plant/controllers/CreatePlantController.js';
import { bindRun } from '../shared/bindRun.js';

const api = (createPlant: CreatePlant) => {
  const createPlantCtrl = new CreatePlantController(createPlant);

  return {
    createPlant: bindRun(createPlantCtrl)
  };
};

export const plantApiInvoker = makeInvoker(api);
