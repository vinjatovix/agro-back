import type { MonthSet } from '../../../../../../shared/domain/value-objects/MonthSet.js';
import type { Range } from '../../../../../../shared/domain/value-objects/Range.js';
import type { Metadata } from '../../../../../shared/domain/valueObject/Metadata.js';
import type { Uuid } from '../../../../../shared/domain/valueObject/Uuid.js';
import type { PlantLifecycle } from '../../value-objects/PlantLifecycle.js';
import type { PlantSowing } from '../../value-objects/PlantSowing.js';
import type { PlantStatus } from './PlantStatus.js';
import type { PollinationType } from './PollinationType.js';
import type { PlantKnowledge } from '../../value-objects/PlantKnowledge.js';

export type PlantProps = {
  id: Uuid;

  identity: {
    name: {
      primary: string;
      aliases?: string[];
    };
    scientificName?: string;
    familyId: string;
  };

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
