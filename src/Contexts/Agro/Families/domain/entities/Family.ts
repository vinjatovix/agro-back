import { hasStateChanged } from '../../../../../shared/domain/diff/hasStateChanged.js';
import type { UnknownRecord } from '../../../../../shared/domain/types/UnknownRecord.js';
import { AggregateRoot } from '../../../../shared/domain/entities/AggregateRoot.js';
import { InvalidArgumentException } from '../../../../shared/domain/errors/index.js';
import {
  type WriteOutcome,
  versionAfter
} from '../../../../shared/domain/repositories/WriteOutcome.js';
import { Metadata } from '../../../../shared/domain/valueObject/Metadata.js';
import type { FamilyId } from '../FamilyId.js';
import type { FamilyExtraChanges } from '../types/FamilyExtraChanges.js';
import type { FamilyExtraPrimitives } from '../types/FamilyExtraPrimitives.js';
import type { FamilyInformationChanges } from '../types/FamilyInformationChanges.js';
import type { FamilyProps } from '../types/FamilyProps.js';

const EXTRA_KEYS = [
  'order',
  'subfamilies',
  'distribution',
  'speciesCount'
] as const satisfies ReadonlyArray<keyof FamilyExtraChanges>;

/** `undefined` keeps the key, `null` removes it, any other value replaces it. */
function applyExtraKey<K extends keyof FamilyExtraPrimitives>(
  target: FamilyExtraPrimitives,
  key: K,
  value: FamilyExtraPrimitives[K] | null | undefined
): void {
  if (value === undefined) return;
  if (value === null) delete target[key];
  else target[key] = value;
}

export class Family extends AggregateRoot<FamilyId> {
  private props: FamilyProps & { version: number };

  private constructor(props: FamilyProps) {
    super(props.id);
    Family.validate(props);
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

  private static validate(props: FamilyProps): void {
    const requiredKeys: Array<keyof FamilyProps> = [
      'slug',
      'name',
      'scientificName',
      'shortDescription',
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

  private applyTextChange(
    candidate: FamilyProps & { version: number },
    field: 'slug' | 'name' | 'scientificName' | 'shortDescription',
    value: string | undefined
  ): void {
    if (value === undefined) return;
    const trimmed = value.trim();
    if (!trimmed)
      throw new InvalidArgumentException(`Family.${field} cannot be empty`);
    candidate[field] = trimmed;
  }

  private applyExtraChanges(
    candidate: FamilyProps & { version: number },
    extraChanges: FamilyExtraChanges
  ): void {
    const next: FamilyExtraPrimitives = { ...(this.props.extra ?? {}) };

    for (const key of EXTRA_KEYS) {
      applyExtraKey(next, key, extraChanges[key]);
    }

    // An empty `extra` has a single representation: absent.
    if (Object.keys(next).length) candidate.extra = next;
    else delete candidate.extra;
  }

  syncVersion(outcome: WriteOutcome): void {
    this.props = Object.freeze({
      ...this.props,
      version: versionAfter(this.props.version, outcome)
    });
  }

  updateInformation(
    changes: FamilyInformationChanges,
    user: string,
    at: Date = new Date()
  ): void {
    const candidate: FamilyProps & { version: number } = { ...this.props };

    this.applyTextChange(candidate, 'slug', changes.slug);
    this.applyTextChange(candidate, 'name', changes.name);
    this.applyTextChange(candidate, 'scientificName', changes.scientificName);
    this.applyTextChange(
      candidate,
      'shortDescription',
      changes.shortDescription
    );

    if (changes.aliases !== undefined)
      candidate.aliases = changes.aliases.map((a) => a.trim()).filter(Boolean);
    if (changes.highlights !== undefined)
      candidate.highlights = changes.highlights;

    if (changes.extra === null) {
      delete candidate.extra;
    } else if (changes.extra !== undefined) {
      this.applyExtraChanges(candidate, changes.extra);
    }

    Family.validate(candidate);

    if (
      !hasStateChanged(Family.snapshot(this.props), Family.snapshot(candidate))
    )
      return;

    this.props = Object.freeze({
      ...candidate,
      metadata: Metadata.update(this.props.metadata, user, at)
    });
  }

  /** Information fields only: audit data and version are not a change. */
  private static snapshot(props: FamilyProps): UnknownRecord {
    const { metadata: _metadata, version: _version, ...information } = props;

    return information;
  }

  static create(props: FamilyProps): Family {
    return new Family(props);
  }
}
