import { createError } from '../../../../../shared/errors/index.js';
import type { PlantKnowledgePrimitives } from '../domain/entities/types/PlantKnowledgePrimitives.js';
import type { PlantKnowledgeProps } from '../domain/value-objects/interfaces/PlantKnowledgeProps.js';
import { PlantKnowledge } from '../domain/value-objects/PlantKnowledge.js';
import { RootSystem } from '../domain/value-objects/RootSystem.js';
import { SoilProfile } from '../domain/value-objects/SoilProfile.js';

export const plantKnowledgeMapper = {
  toPrimitives(knowledge: PlantKnowledge): PlantKnowledgePrimitives {
    const result: PlantKnowledgePrimitives = {};

    if (knowledge.watering) {
      result.watering = {
        frequency: knowledge.watering.frequency
      };

      if (knowledge.watering.conditions) {
        result.watering.conditions = knowledge.watering.conditions;
      }
    }

    if (knowledge.light) {
      result.light = knowledge.light;
    }

    if (knowledge.pruning) {
      result.pruning = knowledge.pruning;
    }

    if (knowledge.propagation) {
      result.propagation = knowledge.propagation;
    }

    if (knowledge.ecology) {
      result.ecology = knowledge.ecology;
    }

    if (knowledge.resources) {
      result.resources = knowledge.resources;
    }

    if (knowledge.notes) {
      result.notes = knowledge.notes;
    }

    if (knowledge.soil) {
      result.soil = knowledge.soil.toPrimitives();
    }

    if (knowledge.rootSystem) {
      result.rootSystem = knowledge.rootSystem.toPrimitives();
    }

    return result;
  },
  fromPrimitives(primitives?: PlantKnowledgePrimitives): PlantKnowledge {
    if (!primitives) {
      throw createError.badRequest(
        'PlantKnowledgePrimitives is required to create PlantKnowledge'
      );
    }

    const props: Partial<PlantKnowledgeProps> = {};

    if (primitives.soil) {
      props.soil = SoilProfile.fromPrimitives(primitives.soil);
    }

    if (primitives.rootSystem) {
      props.rootSystem = RootSystem.fromPrimitives(primitives.rootSystem);
    }

    if (primitives.watering) {
      props.watering = {
        frequency: primitives.watering.frequency
      };

      if (primitives.watering.conditions) {
        props.watering.conditions = primitives.watering.conditions;
      }
    }

    if (primitives.light) {
      props.light = primitives.light;
    }

    if (primitives.pruning) {
      props.pruning = primitives.pruning;
    }

    if (primitives.propagation) {
      props.propagation = primitives.propagation;
    }

    if (primitives.ecology) {
      props.ecology = primitives.ecology;
    }

    if (primitives.resources) {
      props.resources = primitives.resources;
    }

    if (primitives.notes) {
      props.notes = primitives.notes;
    }

    return new PlantKnowledge(props as PlantKnowledgeProps);
  }
};
