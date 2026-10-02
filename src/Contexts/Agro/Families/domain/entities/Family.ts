import { hasStateChanged } from '../../../../../shared/domain/diff/hasStateChanged.js';
import type { UnknownRecord } from '../../../../../shared/domain/types/UnknownRecord.js';
import { requiredText } from '../../../../../shared/domain/utils/requiredText.js';
import { uniqueTextList } from '../../../../../shared/domain/utils/uniqueTextList.js';
import { AggregateRoot } from '../../../../shared/domain/entities/AggregateRoot.js';
import { InvalidArgumentException } from '../../../../shared/domain/errors/index.js';
import {
  type WriteOutcome,
  versionAfter
} from '../../../../shared/domain/repositories/WriteOutcome.js';
import { Metadata } from '../../../../shared/domain/valueObject/Metadata.js';
import { familyExtra } from '../FamilyExtra.js';
import type { FamilyId } from '../FamilyId.js';
import type { FamilyExtraChanges } from '../types/FamilyExtraChanges.js';
import type { FamilyExtraPrimitives } from '../types/FamilyExtraPrimitives.js';
import type { FamilyInformationChanges } from '../types/FamilyInformationChanges.js';
import type { FamilyProps } from '../types/FamilyProps.js';

type FamilyState = FamilyProps & { version: number };

type RequiredTextKey = 'slug' | 'name' | 'scientificName' | 'shortDescription';

type TextListKey = 'aliases' | 'highlights';

const INFORMATION_KEYS = [
  'slug',
  'name',
  'scientificName',
  'shortDescription',
  'aliases',
  'highlights'
] as const satisfies ReadonlyArray<RequiredTextKey | TextListKey>;

const EXTRA_KEYS = [
  'order',
  'subfamilies',
  'distribution',
  'speciesCount'
] as const satisfies ReadonlyArray<keyof FamilyExtraChanges>;

/** `undefined` keeps the field, any other value replaces it. */
function applyChange<K extends RequiredTextKey | TextListKey>(
  target: FamilyProps,
  key: K,
  value: FamilyProps[K] | undefined
): void {
  if (value !== undefined) target[key] = value;
}

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

const familyText = (value: unknown, field: RequiredTextKey): string => {
  if (typeof value !== 'string') {
    throw new InvalidArgumentException(`Family.${field} is required`);
  }
  return requiredText(value, `Family.${field}`);
};

const familyTextList = (value: unknown, field: TextListKey): string[] => {
  if (!Array.isArray(value)) {
    throw new InvalidArgumentException(`Family.${field} must be an array`);
  }
  return uniqueTextList(value, `Family.${field}`);
};

export class Family extends AggregateRoot<FamilyId> {
  private props: FamilyState;

  private constructor(props: FamilyProps) {
    super(props.id);
    this.props = Object.freeze({
      ...Family.normalise(props),
      version: props.version ?? 0
    });
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

  /**
   * Every built family meets the catalog rules, whether created, loaded or
   * updated: required texts trimmed and never blank, text lists without blanks
   * or repeats, and an empty `extra` stored as absent.
   */
  private static normalise(props: FamilyProps): FamilyProps {
    if (!props.metadata) {
      throw new InvalidArgumentException('Family.metadata is required');
    }
    const { extra: rawExtra, ...rest } = props;
    const extra = familyExtra(rawExtra);

    return {
      ...rest,
      slug: familyText(props.slug, 'slug'),
      name: familyText(props.name, 'name'),
      scientificName: familyText(props.scientificName, 'scientificName'),
      shortDescription: familyText(props.shortDescription, 'shortDescription'),
      aliases: familyTextList(props.aliases, 'aliases'),
      highlights: familyTextList(props.highlights, 'highlights'),
      ...(extra !== undefined ? { extra } : {})
    };
  }

  private mergeExtra(extraChanges: FamilyExtraChanges): FamilyExtraPrimitives {
    const next: FamilyExtraPrimitives = { ...(this.props.extra ?? {}) };

    for (const key of EXTRA_KEYS) {
      applyExtraKey(next, key, extraChanges[key]);
    }

    return next;
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
    const draft: FamilyState = { ...this.props };

    for (const key of INFORMATION_KEYS) {
      applyChange(draft, key, changes[key]);
    }

    if (changes.extra === null) delete draft.extra;
    else if (changes.extra !== undefined)
      draft.extra = this.mergeExtra(changes.extra);

    const candidate = Family.normalise(draft);

    if (
      !hasStateChanged(Family.snapshot(this.props), Family.snapshot(candidate))
    )
      return;

    this.props = Object.freeze({
      ...candidate,
      version: this.props.version,
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
