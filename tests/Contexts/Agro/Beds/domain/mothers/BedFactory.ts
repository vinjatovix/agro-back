import {
  Bed,
  type BedProps
} from '../../../../../../src/Contexts/Agro/Beds/domain/entities/Bed.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/index.js';
import { Metadata } from '../../../../../../src/Contexts/shared/domain/valueObject/Metadata.js';
import { Uuid } from '../../../../../../src/Contexts/shared/domain/valueObject/Uuid.js';
import { random } from '../../../../shared/fixtures/random.js';
import { UuidMother } from '../../../../shared/fixtures/UuidMother.js';
import { PlantInstanceMother } from '../../../PlantInstances/domain/mothers/PlantInstanceMother.js';
import { PositiveNumber } from '../../../../../../src/Contexts/shared/domain/valueObject/PositiveNumber.js';
import { StringValueObject } from '../../../../../../src/Contexts/shared/domain/valueObject/StringValueObject.js';

type BedOverrides = Partial<BedProps>;

function baseBed(overrides: BedOverrides = {}): BedProps {
  return {
    id: overrides.id ?? UuidMother.random(),
    userId: overrides.userId ?? UuidMother.random(),
    name:
      overrides.name ??
      new StringValueObject(`Bed ${random.integer({ min: 1, max: 100 })}`),
    width: overrides.width ?? PositiveNumber.create(100),
    height: overrides.height ?? PositiveNumber.create(200),
    depth: overrides.depth ?? PositiveNumber.create(30),
    plantInstances: overrides.plantInstances ?? [],
    metadata: overrides.metadata ?? Metadata.create('test'),
    deleted: overrides.deleted ?? false,
    ...(overrides.deletedAt && { deletedAt: overrides.deletedAt })
  };
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
      id: UuidMother.random(),
      userId: new Uuid(user.id),
      name: randomName(),
      plantInstances: withPlants ? [PlantInstanceMother.create()] : [],
      metadata: Metadata.create(user.username),
      deleted: false
    });
  }
}
