import type { UpdateBedInput } from '../../../../../../src/Contexts/Agro/Beds/application/useCases/interfaces/UpdateBedInput.js';
import { random } from '../../../../shared/fixtures/random.js';

export class UpdateBedInputMother {
  static random(overrides: Partial<UpdateBedInput> = {}): UpdateBedInput {
    return {
      id: random.uuid(),
      name: random.word(),
      width: random.integer({ min: 10, max: 500 }),
      height: random.integer({ min: 10, max: 500 }),
      depth: random.integer({ min: 10, max: 100 }),
      ...overrides
    };
  }
}
