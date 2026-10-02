import { Plant } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/Plant.js';
import type { PlantProps } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantProps.js';
import { PlantStatus } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantStatus.js';
import { randomPlantId } from '../../../../../../src/Contexts/Agro/Plants/domain/PlantId.js';
import { PlantKnowledge } from '../../../../../../src/Contexts/Agro/Plants/domain/value-objects/PlantKnowledge.js';
import { Metadata } from '../../../../../../src/Contexts/shared/domain/valueObject/Metadata.js';
import { PlantIdentityBuilder } from './PlantIdentityBuilder.js';
import { PlantPhenologyBuilder } from './PlantPhenologyBuilder.js';
import { PlantTraitsBuilder } from './PlantTraitsBuilder.js';

type DefaultBuilders = {
  identity: () => ReturnType<typeof PlantIdentityBuilder.generic>;
  traits: () => ReturnType<typeof PlantTraitsBuilder.generic>;
  phenology: () => ReturnType<typeof PlantPhenologyBuilder.generic>;
};

export class PlantFactory {
  private static buildProps(
    overrides: Partial<PlantProps>,
    defaultBuilders: DefaultBuilders
  ): PlantProps {
    const status = overrides.deletedAt ? PlantStatus.DELETED : overrides.status;
    return {
      id: overrides.id ?? randomPlantId(),
      identity: overrides.identity ?? defaultBuilders.identity(),
      traits: overrides.traits ?? defaultBuilders.traits(),
      phenology: overrides.phenology ?? defaultBuilders.phenology(),
      knowledge: overrides.knowledge ?? PlantKnowledge.empty(),
      metadata: overrides.metadata ?? Metadata.create('test'),
      ...(status !== undefined && { status }),
      ...(overrides.deletedAt !== undefined && {
        deletedAt: overrides.deletedAt
      })
    };
  }

  static create(overrides: Partial<PlantProps> = {}): Plant {
    return new Plant(
      this.buildProps(overrides, {
        identity: () => PlantIdentityBuilder.generic(),
        traits: () => PlantTraitsBuilder.generic(),
        phenology: () => PlantPhenologyBuilder.generic()
      })
    );
  }

  static random(overrides: Partial<PlantProps> = {}): Plant {
    return new Plant(
      this.buildProps(overrides, {
        identity: () => PlantIdentityBuilder.random(),
        traits: () => PlantTraitsBuilder.random(),
        phenology: () => PlantPhenologyBuilder.random()
      })
    );
  }

  static full(overrides: Partial<PlantProps> = {}): Plant {
    return new Plant(
      this.buildProps(overrides, {
        identity: () => PlantIdentityBuilder.withScientificName(),
        traits: () => PlantTraitsBuilder.random(),
        phenology: () => PlantPhenologyBuilder.full()
      })
    );
  }

  static tomato(overrides: Partial<PlantProps> = {}): Plant {
    return new Plant(
      this.buildProps(overrides, {
        identity: () => PlantIdentityBuilder.tomato(),
        traits: () => PlantTraitsBuilder.tomato(),
        phenology: () => PlantPhenologyBuilder.tomato()
      })
    );
  }

  static lettuce(overrides: Partial<PlantProps> = {}): Plant {
    return new Plant(
      this.buildProps(overrides, {
        identity: () => PlantIdentityBuilder.lettuce(),
        traits: () => PlantTraitsBuilder.lettuce(),
        phenology: () => PlantPhenologyBuilder.lettuce()
      })
    );
  }
}
