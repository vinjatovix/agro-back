import { requiredText } from '../../../../../shared/domain/utils/requiredText.js';
import { Range } from '../../../../../shared/domain/value-objects/Range.js';
import type { RootSystemPrimitives } from '../entities/types/RootSystemPrimitives.js';
import type { RootSystemType } from '../entities/types/RootSystemType.js';

export class RootSystem {
  public readonly type: RootSystemType;

  constructor(
    type: RootSystemType,
    public readonly depthCm: Range,
    public readonly spreadCm: Range
  ) {
    this.type = requiredText(type, 'rootSystem.type');
  }

  static fromPrimitives(p: RootSystemPrimitives): RootSystem {
    return new RootSystem(
      p.type,
      Range.fromPrimitives(p.depthCm),
      Range.fromPrimitives(p.spreadCm)
    );
  }

  toPrimitives(): RootSystemPrimitives {
    return {
      type: this.type,
      depthCm: this.depthCm.toPrimitives(),
      spreadCm: this.spreadCm.toPrimitives()
    };
  }
}
