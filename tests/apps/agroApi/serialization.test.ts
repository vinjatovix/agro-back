import { createBedId } from '../../../src/Contexts/Agro/Beds/domain/BedId.js';
import { random } from '../../Contexts/shared/fixtures/random.js';

describe('Branded Types Serialization', () => {
  it('should serialize a branded type identifier to a raw JSON string using JSON.stringify', () => {
    const rawUuid = random.uuid();
    const bedId = createBedId(rawUuid);
    const payload = {
      id: bedId,
      name: 'Main Bed'
    };

    const serialized = JSON.stringify(payload);

    expect(serialized).toBe(`{"id":"${rawUuid}","name":"Main Bed"}`);
  });

  it('should serialize deep nested branded type identifiers inside objects and arrays', () => {
    const rawUuid1 = random.uuid();
    const rawUuid2 = random.uuid();
    const bedId1 = createBedId(rawUuid1);
    const bedId2 = createBedId(rawUuid2);
    const payload = {
      beds: [
        { id: bedId1, status: 'active' },
        { id: bedId2, status: 'inactive' }
      ],
      metadata: {
        lastUpdatedId: bedId1
      }
    };

    const serialized = JSON.stringify(payload);

    expect(serialized).toBe(
      `{"beds":[{"id":"${rawUuid1}","status":"active"},{"id":"${rawUuid2}","status":"inactive"}],"metadata":{"lastUpdatedId":"${rawUuid1}"}}`
    );
  });
});
