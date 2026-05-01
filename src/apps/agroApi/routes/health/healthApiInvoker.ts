import { makeInvoker } from 'awilix-express';
import { HealthController } from '../../controllers/health/HealthController.js';
import { bindRun } from '../shared/index.js';

const api = (healthController: HealthController) => {
  return {
    getHealth: bindRun(healthController)
  };
};

export const healthApiInvoker = makeInvoker(api);
