import type { CreateBedInput } from '../../../../../../src/Contexts/Agro/Beds/application/useCases/interfaces/CreateBedInput.js';
import { random } from '../../../../shared/fixtures/random.js';

export class CreateBedInputMother {
  static random(overrides: Partial<CreateBedInput> = {}): CreateBedInput {
    return {
      id: random.uuid(),
      userId: random.uuid(),
      name: random.word(),
      width: random.integer({ min: 10, max: 500 }),
      height: random.integer({ min: 10, max: 500 }),
      depth: random.integer({ min: 10, max: 100 }),
      ...overrides
    };
  }
}
