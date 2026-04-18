import { makeInvoker } from 'awilix-express';
import type { CheckHealth } from '../../../../Contexts/agroApi/health/application/index.js';
import { HealthController } from '../../controllers/health/index.js';
import { bindRun } from '../shared/index.js';

const api = (checkHealth: CheckHealth) => {
  const healthController = new HealthController(checkHealth);

  return {
    getHealth: bindRun(healthController)
  };
};

export const healthApiInvoker = makeInvoker(api);
