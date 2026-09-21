import type { MonthSet } from '../../../../../../shared/domain/value-objects/MonthSet.js';
import type { Range } from '../../../../../../shared/domain/value-objects/Range.js';
import type { Metadata } from '../../../../../shared/domain/valueObject/Metadata.js';
import type { IdentityDomain } from '../../../mappers/plantIdentityMapper.js';
import type { PlantId } from '../../PlantId.js';
import type { PlantKnowledge } from '../../value-objects/PlantKnowledge.js';
import type { PlantLifecycle } from '../../value-objects/PlantLifecycle.js';
import type { PlantSowing } from '../../value-objects/PlantSowing.js';
import type { PlantStatus } from './PlantStatus.js';
import type { PollinationType } from './PollinationType.js';

export type PlantProps = {
  id: PlantId;

  identity: IdentityDomain;

  traits: {
    lifecycle: PlantLifecycle;
    size: {
      height: Range;
      spread: Range;
    };
    spacingCm: Range;
  };

  phenology: {
    sowing: PlantSowing;
    flowering: {
      months: MonthSet;
      pollination?: {
        type: PollinationType;
        agents?: string[];
      };
    };
    harvest: {
      months: MonthSet;
      description?: string;
    };
  };

  knowledge?: PlantKnowledge;

  metadata: Metadata;

  status?: PlantStatus;
  deletedAt?: Date;
};
