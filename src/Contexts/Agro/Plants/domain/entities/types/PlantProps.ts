import type { Range } from '../../../../../../shared/domain/value-objects/Range.js';
import type { Metadata } from '../../../../../shared/domain/valueObject/Metadata.js';
import type { PlantId } from '../../PlantId.js';
import type { PlantIdentity } from '../../value-objects/PlantIdentity.js';
import type { PlantKnowledge } from '../../value-objects/PlantKnowledge.js';
import type { PlantLifecycle } from '../../value-objects/PlantLifecycle.js';
import type { PlantPhenology } from '../../value-objects/PlantPhenology.js';
import type { PlantStatus } from './PlantStatus.js';

export type PlantProps = {
  id: PlantId;

  identity: PlantIdentity;

  traits: {
    lifecycle: PlantLifecycle;
    size: {
      height: Range;
      spread: Range;
    };
    spacingCm: Range;
  };

  phenology: PlantPhenology;

  knowledge: PlantKnowledge;

  metadata: Metadata;

  status?: PlantStatus;
  deletedAt?: Date;
  version?: number;
};
