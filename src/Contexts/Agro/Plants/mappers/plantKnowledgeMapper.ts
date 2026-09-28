import { InvalidArgumentException } from '../../../shared/domain/errors/index.js';
import type { PlantKnowledgePrimitives } from '../domain/entities/types/PlantKnowledgePrimitives.js';
import { PlantKnowledge } from '../domain/value-objects/PlantKnowledge.js';

export const plantKnowledgeMapper = {
  toPrimitives(knowledge: PlantKnowledge): PlantKnowledgePrimitives {
    return knowledge.toPrimitives();
  },

  fromPrimitives(primitives?: PlantKnowledgePrimitives): PlantKnowledge {
    if (!primitives) {
      throw new InvalidArgumentException(
        'PlantKnowledgePrimitives is required to create PlantKnowledge'
      );
    }

    return PlantKnowledge.fromPrimitives(primitives);
  }
};
