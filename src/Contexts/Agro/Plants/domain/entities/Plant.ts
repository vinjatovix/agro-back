import { hasStateChanged } from '../../../../../shared/domain/diff/hasStateChanged.js';
import type { UnknownRecord } from '../../../../../shared/domain/types/UnknownRecord.js';
import { deepFreeze } from '../../../../../shared/domain/utils/deepFreeze.js';
import { patchField } from '../../../../../shared/domain/utils/patchField.js';
import { requiredText } from '../../../../../shared/domain/utils/requiredText.js';
import { AggregateRoot } from '../../../../shared/domain/entities/AggregateRoot.js';
import {
  DomainConflictException,
  InvalidArgumentException
} from '../../../../shared/domain/errors/index.js';
import {
  type WriteOutcome,
  versionAfter
} from '../../../../shared/domain/repositories/WriteOutcome.js';
import { Metadata } from '../../../../shared/domain/valueObject/index.js';
import type { PlantId } from '../PlantId.js';
import { PlantLifecycle } from '../value-objects/PlantLifecycle.js';
import {
  type PlantEcologicalTraits,
  type PlantEcologicalTraitsChanges,
  type PlantProps,
  PlantStatus
} from './types/index.js';
import type { PlantIdentityChanges } from './types/PlantIdentityChanges.js';
import type { PlantKnowledgeChanges } from './types/PlantKnowledgeChanges.js';
import type { PlantPhenologyChanges } from './types/PlantPhenologyChanges.js';
import type { PlantTraitsChanges } from './types/PlantTraitsChanges.js';

export class Plant extends AggregateRoot<PlantId> {
  private props: PlantProps & { status: PlantStatus; version: number };

  constructor(props: PlantProps) {
    super(props.id);
    this.validateProps(props);
    this.props = deepFreeze({
      ...props,
      traits: Plant.withEcological(props.traits),
      status: props.status ?? PlantStatus.ACTIVE,
      version: props.version ?? 0
    });
  }

  private validateProps(props: PlantProps) {
    if (props.status === PlantStatus.ACTIVE && props.deletedAt) {
      throw new InvalidArgumentException('Active plant cannot have deletedAt');
    }
    if (props.status === PlantStatus.DELETED && !props.deletedAt) {
      throw new InvalidArgumentException('Deleted plant must have deletedAt');
    }
  }

  private assertActive(): void {
    if (this.isDeleted()) {
      throw new DomainConflictException('Cannot mutate a deleted plant');
    }
  }

  get identity() {
    return this.props.identity;
  }

  get traits() {
    return this.props.traits;
  }

  get phenology() {
    return this.props.phenology;
  }

  get knowledge() {
    return this.props.knowledge;
  }

  get metadata(): Metadata {
    return this.props.metadata;
  }

  get version(): number {
    return this.props.version;
  }

  get status(): PlantStatus {
    return this.props.status;
  }

  get deletedAt(): Date | undefined {
    return this.props.deletedAt;
  }

  isDeleted(): boolean {
    return this.status === PlantStatus.DELETED;
  }

  markAsDeleted(user: string, at: Date = new Date()): void {
    if (this.isDeleted()) return;

    this.commit({ status: PlantStatus.DELETED, deletedAt: at }, user, at);
  }

  syncVersion(outcome: WriteOutcome): void {
    this.props = deepFreeze({
      ...this.props,
      version: versionAfter(this.props.version, outcome)
    });
  }

  /** Applies a real state change together with the acting user and time. */
  private commit(changes: Partial<PlantProps>, user: string, at: Date): void {
    this.props = deepFreeze({
      ...this.props,
      ...changes,
      metadata: Metadata.update(this.props.metadata, user, at)
    });
  }

  updateIdentity(
    changes: PlantIdentityChanges,
    user: string,
    at: Date = new Date()
  ): void {
    this.assertActive();

    const identity = this.props.identity.update(changes);

    if (
      !hasStateChanged(
        this.props.identity.toPrimitives(),
        identity.toPrimitives()
      )
    )
      return;

    this.commit({ identity }, user, at);
  }

  updateTraits(
    changes: PlantTraitsChanges,
    user: string,
    at: Date = new Date()
  ): void {
    this.assertActive();

    const lifecycle = changes.lifecycle
      ? PlantLifecycle.from(changes.lifecycle)
      : this.props.traits.lifecycle;

    const spacingCm = changes.spacingCm
      ? this.props.traits.spacingCm.with(changes.spacingCm)
      : this.props.traits.spacingCm;

    const height = changes.size?.height
      ? this.props.traits.size.height.with(changes.size.height)
      : this.props.traits.size.height;

    const spread = changes.size?.spread
      ? this.props.traits.size.spread.with(changes.size.spread)
      : this.props.traits.size.spread;

    const ecological = changes.ecological
      ? Plant.patchEcological(this.props.traits.ecological, changes.ecological)
      : this.props.traits.ecological;

    const traits = Plant.withEcological(
      { lifecycle, spacingCm, size: { height, spread } },
      ecological
    );

    if (
      !hasStateChanged(
        Plant.traitsSnapshot(this.props.traits),
        Plant.traitsSnapshot(traits)
      )
    )
      return;

    this.commit({ traits }, user, at);
  }

  private static traitsSnapshot(traits: PlantProps['traits']): UnknownRecord {
    return {
      lifecycle: traits.lifecycle.getValue(),
      spacingCm: traits.spacingCm.toPrimitives(),
      height: traits.size.height.toPrimitives(),
      spread: traits.size.spread.toPrimitives(),
      ecological: traits.ecological ?? {}
    };
  }

  /** An absent key is kept, `null` removes it. */
  private static patchEcological(
    current: PlantEcologicalTraits | undefined,
    changes: PlantEcologicalTraitsChanges
  ): PlantEcologicalTraits {
    const edible = patchField(changes.edible, current?.edible);
    const toxic = patchField(changes.toxic, current?.toxic);
    const toxicityNotes = patchField(
      changes.toxicityNotes,
      current?.toxicityNotes
    );

    return {
      ...(edible !== undefined && { edible }),
      ...(toxic !== undefined && { toxic }),
      ...(toxicityNotes !== undefined && { toxicityNotes })
    };
  }

  /**
   * Sets `ecological`, leaving it out when it holds no key (never `{}`).
   * `toxicityNotes` is trimmed and never blank.
   */
  private static withEcological(
    traits: PlantProps['traits'],
    ecological: PlantEcologicalTraits | undefined = traits.ecological
  ): PlantProps['traits'] {
    const { lifecycle, size, spacingCm } = traits;
    if (!ecological) return { lifecycle, size, spacingCm };

    const { toxicityNotes, ...flags } = ecological;
    const definedFlags = Object.fromEntries(
      Object.entries(flags).filter(([, v]) => v !== undefined)
    );

    if (Object.keys(definedFlags).length === 0 && toxicityNotes === undefined) {
      return { lifecycle, size, spacingCm };
    }

    return {
      lifecycle,
      size,
      spacingCm,
      ecological: {
        ...definedFlags,
        ...(toxicityNotes !== undefined && {
          toxicityNotes: requiredText(
            toxicityNotes,
            'traits.ecological.toxicityNotes'
          )
        })
      }
    };
  }

  updatePhenology(
    changes: PlantPhenologyChanges,
    user: string,
    at: Date = new Date()
  ): void {
    this.assertActive();

    const phenology = this.props.phenology.update(changes);

    if (
      !hasStateChanged(
        this.props.phenology.toPrimitives(),
        phenology.toPrimitives()
      )
    )
      return;

    this.commit({ phenology }, user, at);
  }

  updateKnowledge(
    changes: PlantKnowledgeChanges,
    user: string,
    at: Date = new Date()
  ): void {
    this.assertActive();

    const knowledge = this.props.knowledge.update(changes);

    if (
      !hasStateChanged(
        this.props.knowledge.toPrimitives(),
        knowledge.toPrimitives()
      )
    )
      return;

    this.commit({ knowledge }, user, at);
  }
}
