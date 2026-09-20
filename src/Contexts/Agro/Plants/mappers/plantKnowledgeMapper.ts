import { InvalidArgumentException } from '../../../shared/domain/errors/index.js';
import type { PlantKnowledgePrimitives } from '../domain/entities/types/PlantKnowledgePrimitives.js';
import type { PlantKnowledgeProps } from '../domain/value-objects/interfaces/PlantKnowledgeProps.js';
import { PlantKnowledge } from '../domain/value-objects/PlantKnowledge.js';
import { RootSystem } from '../domain/value-objects/RootSystem.js';
import { SoilProfile } from '../domain/value-objects/SoilProfile.js';

function mapWateringToPrimitives(
  watering: NonNullable<PlantKnowledge['watering']>
): NonNullable<PlantKnowledgePrimitives['watering']> {
  const result: NonNullable<PlantKnowledgePrimitives['watering']> = {
    frequency: watering.frequency
  };
  if (watering.conditions) {
    result.conditions = watering.conditions;
  }
  return result;
}

function mapSubsystemsToPrimitives(
  knowledge: PlantKnowledge,
  result: PlantKnowledgePrimitives
): void {
  if (knowledge.soil) {
    result.soil = knowledge.soil.toPrimitives();
  }
  if (knowledge.rootSystem) {
    result.rootSystem = knowledge.rootSystem.toPrimitives();
  }
}

function mapWateringFromPrimitives(
  watering: NonNullable<PlantKnowledgePrimitives['watering']>
): NonNullable<PlantKnowledgeProps['watering']> {
  const result: NonNullable<PlantKnowledgeProps['watering']> = {
    frequency: watering.frequency
  };
  if (watering.conditions) {
    result.conditions = watering.conditions;
  }
  return result;
}

function mapSubsystemsFromPrimitives(
  primitives: PlantKnowledgePrimitives,
  props: Partial<PlantKnowledgeProps>
): void {
  if (primitives.soil) {
    props.soil = SoilProfile.fromPrimitives(primitives.soil);
  }
  if (primitives.rootSystem) {
    props.rootSystem = RootSystem.fromPrimitives(primitives.rootSystem);
  }
}

export const plantKnowledgeMapper = {
  toPrimitives(knowledge: PlantKnowledge): PlantKnowledgePrimitives {
    const result: PlantKnowledgePrimitives = {};

    if (knowledge.watering) {
      result.watering = mapWateringToPrimitives(knowledge.watering);
    }

    if (knowledge.light) result.light = knowledge.light;
    if (knowledge.pruning) result.pruning = knowledge.pruning;
    if (knowledge.propagation) result.propagation = knowledge.propagation;
    if (knowledge.ecology) result.ecology = knowledge.ecology;
    if (knowledge.resources) result.resources = knowledge.resources;
    if (knowledge.notes) result.notes = knowledge.notes;

    mapSubsystemsToPrimitives(knowledge, result);

    return result;
  },
  fromPrimitives(primitives?: PlantKnowledgePrimitives): PlantKnowledge {
    if (!primitives) {
      throw new InvalidArgumentException(
        'PlantKnowledgePrimitives is required to create PlantKnowledge'
      );
    }

    const props: Partial<PlantKnowledgeProps> = {};

    mapSubsystemsFromPrimitives(primitives, props);

    if (primitives.watering) {
      props.watering = mapWateringFromPrimitives(primitives.watering);
    }

    if (primitives.light) props.light = primitives.light;
    if (primitives.pruning) props.pruning = primitives.pruning;
    if (primitives.propagation) props.propagation = primitives.propagation;
    if (primitives.ecology) props.ecology = primitives.ecology;
    if (primitives.resources) props.resources = primitives.resources;
    if (primitives.notes) props.notes = primitives.notes;

    return new PlantKnowledge(props);
  }
};
