import { patchField } from '../../../../../shared/domain/utils/patchField.js';
import { requiredText } from '../../../../../shared/domain/utils/requiredText.js';
import {
  createFamilyId,
  type FamilyId
} from '../../../Families/domain/FamilyId.js';
import type { IdentityPrimitives } from '../entities/types/IdentityPrimitives.js';
import type { PlantIdentityChanges } from '../entities/types/PlantIdentityChanges.js';

/**
 * What a plant is called and the family it belongs to. Every plant has a
 * primary name, a scientific name and a family; aliases are trimmed and empty
 * ones dropped.
 */
export class PlantIdentity {
  readonly name: { primary: string; aliases?: string[] };
  readonly scientificName: string;
  readonly family: FamilyId;

  constructor(props: IdentityPrimitives) {
    const primary = requiredText(props.name.primary, 'identity.name.primary');
    const aliases = props.name.aliases
      ?.map((alias) => alias.trim())
      .filter(Boolean);
    this.name = { primary, ...(aliases !== undefined && { aliases }) };
    this.scientificName = requiredText(
      props.scientificName,
      'identity.scientificName'
    );
    this.family = createFamilyId(requiredText(props.family, 'identity.family'));
  }

  /** An absent field is kept; `null` removes the aliases. */
  update(changes: PlantIdentityChanges): PlantIdentity {
    const aliases = patchField(changes.name?.aliases, this.name.aliases);

    return new PlantIdentity({
      name: {
        primary: changes.name?.primary ?? this.name.primary,
        ...(aliases !== undefined && { aliases })
      },
      scientificName: changes.scientificName ?? this.scientificName,
      family: changes.family ?? this.family
    });
  }

  toPrimitives(): IdentityPrimitives {
    const { primary, aliases } = this.name;
    return {
      name: {
        primary,
        ...(aliases !== undefined && { aliases: [...aliases] })
      },
      scientificName: this.scientificName,
      family: this.family
    };
  }

  static fromPrimitives(primitives: IdentityPrimitives): PlantIdentity {
    return new PlantIdentity(primitives);
  }
}
