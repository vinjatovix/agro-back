import type { PlantInstance } from '../../../PlantInstances/domain/entities/PlantInstance.js';
import type { PlantInstanceRepository } from '../../../PlantInstances/domain/repositories/interfaces/PlantInstanceRepository.js';
import type { Bed } from '../../domain/entities/Bed.js';

/** A bed read together with its active crops, which live in their own aggregate. */
export type BedWithCrops = {
  bed: Bed;
  cropIds: string[];
  /** Full crops, loaded only when the client asked to embed them. */
  crops?: PlantInstance[] | undefined;
};

export type BedReadOptions = {
  embedCrops: boolean;
};

const groupByBedId = <T extends { bedId: string }>(
  items: readonly T[]
): Map<string, T[]> => {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const group = groups.get(item.bedId) ?? [];
    group.push(item);
    groups.set(item.bedId, group);
  }
  return groups;
};

/**
 * Loads the active crops of the given beds in one query (only their ids by
 * default, the full crops when `embedCrops` is set) and returns how to pair
 * each bed with them.
 */
const loadCrops = async (
  plantInstanceRepository: PlantInstanceRepository,
  bedIds: string[],
  userId: string,
  { embedCrops }: BedReadOptions
): Promise<(bed: Bed) => BedWithCrops> => {
  if (!embedCrops) {
    const refsByBedId = groupByBedId(
      await plantInstanceRepository.findActiveRefsByBedIds(bedIds, userId)
    );

    return (bed) => ({
      bed,
      cropIds: (refsByBedId.get(bed.id) ?? []).map((ref) => ref.id)
    });
  }

  const cropsByBedId = groupByBedId(
    await plantInstanceRepository.findActiveByBedIds(bedIds, userId)
  );

  return (bed) => {
    const crops = cropsByBedId.get(bed.id) ?? [];
    return { bed, cropIds: crops.map((crop) => crop.id), crops };
  };
};

export const attachCrops = async (
  plantInstanceRepository: PlantInstanceRepository,
  beds: readonly Bed[],
  userId: string,
  options: BedReadOptions
): Promise<BedWithCrops[]> => {
  if (beds.length === 0) {
    return [];
  }

  const withCrops = await loadCrops(
    plantInstanceRepository,
    beds.map((bed) => bed.id),
    userId,
    options
  );

  return beds.map(withCrops);
};

export const attachCropsToBed = async (
  plantInstanceRepository: PlantInstanceRepository,
  bed: Bed,
  userId: string,
  options: BedReadOptions
): Promise<BedWithCrops> => {
  const withCrops = await loadCrops(
    plantInstanceRepository,
    [bed.id],
    userId,
    options
  );

  return withCrops(bed);
};
