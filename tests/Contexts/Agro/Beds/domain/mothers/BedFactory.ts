import { randomBedId } from '../../../../../../src/Contexts/Agro/Beds/domain/BedId.js';
import { Bed } from '../../../../../../src/Contexts/Agro/Beds/domain/entities/Bed.js';
import type { BedProps } from '../../../../../../src/Contexts/Agro/Beds/domain/entities/types/BedProps.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/index.js';
import {
  createUserId,
  randomUserId
} from '../../../../../../src/Contexts/Auth/domain/UserId.js';
import { Metadata } from '../../../../../../src/Contexts/shared/domain/valueObject/Metadata.js';
import { PositiveNumber } from '../../../../../../src/Contexts/shared/domain/valueObject/PositiveNumber.js';
import { StringValueObject } from '../../../../../../src/Contexts/shared/domain/valueObject/StringValueObject.js';
import { random } from '../../../../shared/fixtures/random.js';
import { PlantInstanceMother } from '../../../PlantInstances/domain/mothers/PlantInstanceMother.js';

type BedOverrides = Partial<BedProps>;

function baseBed(overrides: BedOverrides = {}): BedProps {
  const defaults: BedProps = {
    id: randomBedId(),
    userId: randomUserId(),
    name: new StringValueObject(`Bed ${random.integer({ min: 1, max: 100 })}`),
    width: PositiveNumber.create(100),
    height: PositiveNumber.create(200),
    depth: PositiveNumber.create(30),
    plantInstances: [],
    metadata: Metadata.create('test'),
    deleted: false
  };

  return { ...defaults, ...overrides };
}

function randomSize() {
  return {
    width: PositiveNumber.create(random.integer({ min: 100, max: 500 })),
    height: PositiveNumber.create(random.integer({ min: 100, max: 500 })),
    depth: PositiveNumber.create(random.integer({ min: 20, max: 50 }))
  };
}

function randomName() {
  return new StringValueObject(`Bed ${random.integer({ min: 1, max: 100 })}`);
}

export class BedFactory {
  static create(overrides: BedOverrides = {}): Bed {
    return new Bed(baseBed(overrides));
  }

  static random(): Bed {
    return Bed.create({
      ...baseBed(),
      ...randomSize(),
      name: randomName(),
      plantInstances: [PlantInstanceMother.create()],
      metadata: Metadata.create('test-user'),
      deleted: false
    });
  }

  static randomDeleted(): Bed {
    return Bed.create({
      ...baseBed(),
      ...randomSize(),
      name: randomName(),
      plantInstances: [PlantInstanceMother.create()],
      metadata: Metadata.create('test-user'),
      deleted: true,
      deletedAt: new Date()
    });
  }

  static fromUser(user: UserSessionInfo, withPlants: boolean = false): Bed {
    return Bed.create({
      ...baseBed(),
      ...randomSize(),
      id: randomBedId(),
      userId: createUserId(user.id),
      name: randomName(),
      plantInstances: withPlants ? [PlantInstanceMother.create()] : [],
      metadata: Metadata.create(user.username),
      deleted: false
    });
  }
}
