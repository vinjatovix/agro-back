import { createError } from '../../../../../shared/errors/index.js';
import { AggregateRoot } from '../../../../shared/domain/entities/AggregateRoot.js';
import type { Metadata } from '../../../../shared/domain/valueObject/Metadata.js';
import type { Uuid } from '../../../../shared/domain/valueObject/Uuid.js';
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
    if (!props.slug) throw createError.badRequest('Family.slug is required');
    if (!props.name) throw createError.badRequest('Family.name is required');
    if (!props.scientificName)
      throw createError.badRequest('Family.scientificName is required');

    if (!Array.isArray(props.aliases)) {
      throw createError.badRequest('Family.aliases must be an array');
    }

    if (!Array.isArray(props.highlights)) {
      throw createError.badRequest('Family.highlights must be an array');
    }

    if (!props.metadata) {
      throw createError.badRequest('Family.metadata is required');
    }
  }

  static create(props: FamilyProps): Family {
    return new Family(props);
  }
}
