import type { Range } from '../../../../../../shared/domain/value-objects/Range.js';

export interface SoilProfileProps {
  ph: Range;
  availableDepthCm: Range;
}
