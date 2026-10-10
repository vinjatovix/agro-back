import type { PlantInstance } from '../../domain/entities/PlantInstance.js';
import type { PlantInstancePrimitives } from '../../domain/entities/types/PlantInstancePrimitives.js';

export interface PlantInstanceDomainMapper {
  toPrimitives(instance: PlantInstance): PlantInstancePrimitives;
  fromPrimitives(primitives: PlantInstancePrimitives): PlantInstance;
}
