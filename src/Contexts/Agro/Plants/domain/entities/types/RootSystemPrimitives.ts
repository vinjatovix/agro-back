import type { RangePrimitives } from '../../../../../../shared/domain/value-objects/interfaces/RangePrimitives.js';

export type RootSystemPrimitives = {
  type: 'fibrous' | 'taproot' | 'adventitious' | 'rhizome' | (string & {});
  depthCm: RangePrimitives;
  spreadCm: RangePrimitives;
};
