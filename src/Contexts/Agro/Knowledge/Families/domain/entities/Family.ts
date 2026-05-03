import { AggregateRoot } from '../../../../../shared/domain/entities/AggregateRoot.js';
import { Metadata } from '../../../../../shared/domain/valueObject/Metadata.js';
import type { Uuid } from '../../../../../shared/domain/valueObject/Uuid.js';
import type { FamilyExtraPrimitives } from '../types/FamilyExtraPrimitives.js';
import type { FamilyProps } from '../types/FamilyProps.js';

export class Family extends AggregateRoot<Uuid> {
  private readonly props: FamilyProps;

  private constructor(props: FamilyProps) {
    super(props.id);
    this.validate(props);
    this.props = Object.freeze(props);
  }

  get idValue(): string {
    return this.id.value;
  }

  get slug(): string {
    return this.props.slug;
  }

  get name(): string {
    return this.props.name;
  }

  get aliases(): string[] {
    return this.props.aliases;
  }

  get scientificName(): string {
    return this.props.scientificName;
  }

  get shortDescription(): string {
    return this.props.shortDescription;
  }

  get highlights(): string[] {
    return this.props.highlights;
  }

  get extra(): FamilyExtraPrimitives | undefined {
    return this.props.extra;
  }

  get metadata(): Metadata {
    return this.props.metadata;
  }

  private validate(props: FamilyProps): void {
    if (!props.slug) throw new Error('Family.slug is required');
    if (!props.name) throw new Error('Family.name is required');
    if (!props.scientificName)
      throw new Error('Family.scientificName is required');

    if (!Array.isArray(props.aliases)) {
      throw new Error('Family.aliases must be an array');
    }

    if (!Array.isArray(props.highlights)) {
      throw new Error('Family.highlights must be an array');
    }

    if (!props.metadata) {
      throw new Error('Family.metadata is required');
    }
  }

  static create(props: FamilyProps): Family {
    return new Family(props);
  }
}
