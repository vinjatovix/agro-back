import swaggerUi from 'swagger-ui-express';
import type { Express } from 'express';
import { loadOpenApiSpec } from './loadOpenApiSpec.js';

export function setupSwagger(app: Express): void {
  const spec = loadOpenApiSpec();

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
}
