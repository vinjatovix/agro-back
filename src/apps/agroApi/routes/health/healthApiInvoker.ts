import { makeInvoker } from 'awilix-express';
import type { CheckHealth } from '../../../../Contexts/health/application/index.js';
import { HealthController } from '../../controllers/health/HealthController.js';
import { bindRun } from '../shared/index.js';

const api = (checkHealth: CheckHealth) => {
  const healthController = new HealthController(checkHealth);

  return {
    getHealth: bindRun(healthController)
  };
};

export const healthApiInvoker = makeInvoker(api);
