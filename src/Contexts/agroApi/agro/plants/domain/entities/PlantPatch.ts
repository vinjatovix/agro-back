import type { MonthSet } from '../../../../../../shared/domain/value-objects/MonthSet.js';
import type { Range } from '../../../../../../shared/domain/value-objects/Range.js';
import type { Uuid } from '../../../../../shared/domain/valueObject/Uuid.js';
import { PlantLifecycle } from '../value-objects/PlantLifecycle.js';
import type { PlantSowingPatch } from '../value-objects/PlantSowingPatch.js';

export class PlantPatch {
  readonly id: Uuid;

  readonly name?: string;
  readonly familyId?: string;

  readonly lifecycle?: PlantLifecycle;

  readonly size?: {
    height?: Range;
    spread?: Range;
  };

  readonly spacingCm?: Range;

  readonly sowing?: PlantSowingPatch;
  readonly floweringMonths?: MonthSet;
  readonly harvestMonths?: MonthSet;

  readonly scientificName?: string;

  constructor(params: {
    id: Uuid;
    name?: string;
    familyId?: string;
    lifecycle?: PlantLifecycle;
    size?: {
      height?: Range;
      spread?: Range;
    };
    spacingCm?: Range;
    sowing?: PlantSowingPatch;
    floweringMonths?: MonthSet;
    harvestMonths?: MonthSet;
    scientificName?: string;
  }) {
    this.id = params.id;

    if (params.name !== undefined) this.name = params.name;
    if (params.familyId !== undefined) this.familyId = params.familyId;
    if (params.lifecycle !== undefined) this.lifecycle = params.lifecycle;
    if (params.size !== undefined) this.size = params.size;
    if (params.spacingCm !== undefined) this.spacingCm = params.spacingCm;
    if (params.sowing !== undefined) {
      this.sowing = params.sowing;
    }
    if (params.floweringMonths !== undefined)
      this.floweringMonths = params.floweringMonths;
    if (params.harvestMonths !== undefined)
      this.harvestMonths = params.harvestMonths;
    if (params.scientificName !== undefined)
      this.scientificName = params.scientificName;
  }

  toPrimitives() {
    return {
      id: this.id.toString(),
      ...(this.name !== undefined && { name: this.name }),
      ...(this.familyId !== undefined && { familyId: this.familyId }),
      ...(this.lifecycle !== undefined && {
        lifecycle: this.lifecycle.getValue()
      }),
      ...(this.size !== undefined && {
        size: {
          ...(this.size.height !== undefined && {
            height: this.size.height.toPrimitives()
          }),
          ...(this.size.spread !== undefined && {
            spread: this.size.spread.toPrimitives()
          })
        }
      }),
      ...(this.spacingCm !== undefined && {
        spacingCm: this.spacingCm.toPrimitives()
      }),
      ...(this.sowing !== undefined && {
        sowing: this.sowing.toPrimitives()
      }),
      ...(this.floweringMonths !== undefined && {
        floweringMonths: this.floweringMonths.toArray()
      }),
      ...(this.harvestMonths !== undefined && {
        harvestMonths: this.harvestMonths.toArray()
      }),
      ...(this.scientificName !== undefined && {
        scientificName: this.scientificName
      })
    };
  }
}
