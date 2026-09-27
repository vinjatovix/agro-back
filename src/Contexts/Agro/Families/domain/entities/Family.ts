import { AggregateRoot } from '../../../../shared/domain/entities/AggregateRoot.js';
import { InvalidArgumentException } from '../../../../shared/domain/errors/index.js';
import type { Metadata } from '../../../../shared/domain/valueObject/Metadata.js';
import type { FamilyId } from '../FamilyId.js';
import type { FamilyExtraPrimitives } from '../types/FamilyExtraPrimitives.js';
import type { FamilyProps } from '../types/FamilyProps.js';

export class Family extends AggregateRoot<FamilyId> {
  private readonly props: FamilyProps & { version: number };

  private constructor(props: FamilyProps) {
    super(props.id);
    this.validate(props);
    this.props = Object.freeze({ ...props, version: props.version ?? 0 });
  }

  get idValue(): string {
    return this.id;
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

  get version(): number {
    return this.props.version;
  }

  private validate(props: FamilyProps): void {
    const requiredKeys: Array<keyof FamilyProps> = [
      'slug',
      'name',
      'scientificName',
      'metadata'
    ];
    for (const key of requiredKeys) {
      if (!props[key]) {
        throw new InvalidArgumentException(`Family.${key} is required`);
      }
    }

    const arrayKeys: Array<keyof FamilyProps> = ['aliases', 'highlights'];
    for (const key of arrayKeys) {
      if (!Array.isArray(props[key])) {
        throw new InvalidArgumentException(`Family.${key} must be an array`);
      }
    }
  }

  static create(props: FamilyProps): Family {
    return new Family(props);
  }
}
