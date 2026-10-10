import type { BedWithCrops } from '../../../../Contexts/Agro/Beds/application/useCases/attachCrops.js';
import type { BedPrimitives } from '../../../../Contexts/Agro/Beds/domain/entities/types/BedPrimitives.js';
import { bedDomainMapper } from '../../../../Contexts/Agro/Beds/mappers/bedDomainMapper.js';
import type { PlantInstancePrimitives } from '../../../../Contexts/Agro/PlantInstances/domain/entities/types/PlantInstancePrimitives.js';
import { plantInstanceDomainMapper } from '../../../../Contexts/Agro/PlantInstances/mappers/plantInstanceDomainMapper.js';

export type BedResponse = BedPrimitives & {
  plantInstances: string[] | PlantInstancePrimitives[];
};

/** Crops are listed by id unless they were loaded in full to be embedded. */
export const toBedResponse = ({
  bed,
  cropIds,
  crops
}: BedWithCrops): BedResponse => ({
  ...bedDomainMapper.toPrimitives(bed),
  plantInstances: crops
    ? crops.map((crop) => plantInstanceDomainMapper.toPrimitives(crop))
    : cropIds
});
