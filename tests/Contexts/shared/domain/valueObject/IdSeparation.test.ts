import { randomBedId } from '../../../../../src/Contexts/Agro/Beds/domain/BedId.js';
import type { PlantId } from '../../../../../src/Contexts/Agro/Plants/domain/PlantId.js';

describe('IdSeparation', () => {
  it('should not allow assigning a BedId to a PlantId', () => {
    const bedId = randomBedId();

    // @ts-expect-error Type 'BedId' is not assignable to type 'PlantId'
    const plantId: PlantId = bedId;

    expect(plantId).toBe(bedId);
  });
});
