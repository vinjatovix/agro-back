import { Plant } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/Plant.js';
import type { PlantProps } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantProps.js';
import { PlantKnowledge } from '../../../../../../src/Contexts/Agro/Plants/domain/value-objects/PlantKnowledge.js';
import { Metadata } from '../../../../../../src/Contexts/shared/domain/valueObject/Metadata.js';
import { UuidMother } from '../../../../shared/fixtures/UuidMother.js';
import { PlantIdentityBuilder } from './PlantIdentityBuilder.js';
import { PlantKnowledgeBuilder } from './PlantKnowledgeBuilder.js';
import { PlantPhenologyBuilder } from './PlantPhenologyBuilder.js';
import { PlantTraitsBuilder } from './PlantTraitsBuilder.js';

export class PlantFactory {
  static create(overrides: Partial<PlantProps> = {}): Plant {
    return new Plant({
      id: overrides.id ?? UuidMother.random(),
      identity: overrides.identity ?? PlantIdentityBuilder.generic(),
      traits: overrides.traits ?? PlantTraitsBuilder.generic(),
      phenology: overrides.phenology ?? PlantPhenologyBuilder.generic(),
      knowledge: overrides.knowledge ?? PlantKnowledge.empty(),
      metadata: overrides.metadata ?? Metadata.create('test')
    });
  }

  static random(overrides: Partial<PlantProps> = {}): Plant {
    return new Plant({
      id: overrides.id ?? UuidMother.random(),
      identity: overrides.identity ?? PlantIdentityBuilder.random(),
      traits: overrides.traits ?? PlantTraitsBuilder.random(),
      phenology: overrides.phenology ?? PlantPhenologyBuilder.random(),
      knowledge: overrides.knowledge ?? PlantKnowledge.empty(),
      metadata: overrides.metadata ?? Metadata.create('test')
    });
  }

  static full(overrides: Partial<PlantProps> = {}): Plant {
    return new Plant({
      id: overrides.id ?? UuidMother.random(),
      identity: overrides.identity ?? PlantIdentityBuilder.withScientificName(),
      traits: overrides.traits ?? PlantTraitsBuilder.random(),
      phenology: overrides.phenology ?? PlantPhenologyBuilder.full(),
      knowledge: overrides.knowledge ?? PlantKnowledgeBuilder.full(),
      metadata: overrides.metadata ?? Metadata.create('test')
    });
  }

  static tomato(overrides: Partial<PlantProps> = {}): Plant {
    return new Plant({
      id: overrides.id ?? UuidMother.random(),
      identity: overrides.identity ?? PlantIdentityBuilder.tomato(),
      traits: overrides.traits ?? PlantTraitsBuilder.tomato(),
      phenology: overrides.phenology ?? PlantPhenologyBuilder.tomato(),
      knowledge: overrides.knowledge ?? PlantKnowledgeBuilder.tomato(),
      metadata: overrides.metadata ?? Metadata.create('test')
    });
  }

  static lettuce(overrides: Partial<PlantProps> = {}): Plant {
    return new Plant({
      id: overrides.id ?? UuidMother.random(),
      identity: overrides.identity ?? PlantIdentityBuilder.lettuce(),
      traits: overrides.traits ?? PlantTraitsBuilder.lettuce(),
      phenology: overrides.phenology ?? PlantPhenologyBuilder.lettuce(),
      knowledge: overrides.knowledge ?? PlantKnowledgeBuilder.lettuce(),
      metadata: overrides.metadata ?? Metadata.create('test')
    });
  }
}
