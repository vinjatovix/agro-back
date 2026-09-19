import { makeInvoker } from 'awilix-express';
import { HealthController } from '../../controllers/health/HealthController.js';

const api = ({ healthController }: { healthController: HealthController }) => {
  return {
    getHealth: healthController.run
  };
};

export const healthApiInvoker = makeInvoker(api);
