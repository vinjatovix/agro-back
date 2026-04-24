import { Range } from '../../../../../../shared/domain/value-objects/Range.js';
import type { Serializable } from '../../../../../shared/domain/interfaces/Serializable.js';
import type { SoilProfilePrimitives } from '../entities/types/SoilProfilePrimitives.js';
import type { SoilProfileProps } from './interfaces/SoilProfileProps.js';

export class SoilProfile implements Serializable<SoilProfilePrimitives> {
  constructor(private readonly props: SoilProfileProps) {}

  get ph() {
    return this.props.ph;
  }

  get availableDepthCm() {
    return this.props.availableDepthCm;
  }

  toPrimitives(): SoilProfilePrimitives {
    return {
      ph: this.props.ph.toPrimitives(),
      availableDepthCm: this.props.availableDepthCm.toPrimitives()
    };
  }

  static fromPrimitives(p: SoilProfilePrimitives): SoilProfile {
    return new SoilProfile({
      ph: Range.fromPrimitives(p.ph),
      availableDepthCm: Range.fromPrimitives(p.availableDepthCm)
    });
  }
}
