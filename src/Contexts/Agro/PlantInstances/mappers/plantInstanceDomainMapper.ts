import { PlantInstance } from '../domain/entities/PlantInstance.js';
import type { PlantInstancePrimitives } from '../domain/entities/types/PlantInstancePrimitives.js';
import type { PlantInstanceDomainMapper } from './interfaces/PlantInstanceDomainMapper.js';

export const plantInstanceDomainMapper: PlantInstanceDomainMapper = {
  toPrimitives(instance: PlantInstance): PlantInstancePrimitives {
    return instance.toPrimitives();
  },

  fromPrimitives(primitives: PlantInstancePrimitives): PlantInstance {
    return PlantInstance.fromPrimitives(primitives);
  }
};
