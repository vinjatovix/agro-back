import { hasStateChanged } from '../../../../../shared/domain/diff/hasStateChanged.js';
import type { UnknownRecord } from '../../../../../shared/domain/types/UnknownRecord.js';
import { deepFreeze } from '../../../../../shared/domain/utils/deepFreeze.js';
import { MonthSet } from '../../../../../shared/domain/value-objects/MonthSet.js';
import { Range } from '../../../../../shared/domain/value-objects/Range.js';
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
import { createFamilyId } from '../../../Families/domain/FamilyId.js';
import type { PlantId } from '../PlantId.js';
import { PlantKnowledge } from '../value-objects/index.js';
import { PlantLifecycle } from '../value-objects/PlantLifecycle.js';
import { PlantSowing } from '../value-objects/PlantSowing.js';
import { type PlantProps, PlantStatus } from './types/index.js';
import type { PlantIdentityChanges } from './types/PlantIdentityChanges.js';
import type { PlantKnowledgeChanges } from './types/PlantKnowledgeChanges.js';
import type {
  PlantPhenologyChanges,
  PlantSowingChanges
} from './types/PlantPhenologyChanges.js';
import type { PlantTraitsChanges } from './types/PlantTraitsChanges.js';

export class Plant extends AggregateRoot<PlantId> {
  private props: PlantProps & { status: PlantStatus; version: number };

  constructor(props: PlantProps) {
    super(props.id);
    this.validateProps(props);
    this.props = deepFreeze({
      ...props,
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

  private resolveIdentityPrimary(
    changes: PlantIdentityChanges
  ): string | undefined {
    if (changes.name?.primary === undefined) return undefined;
    const trimmed = changes.name.primary.trim();
    if (!trimmed)
      throw new InvalidArgumentException(
        'identity.name.primary cannot be empty'
      );
    return trimmed;
  }

  private resolveIdentityScientificName(
    changes: PlantIdentityChanges
  ): string | undefined {
    if (changes.scientificName === undefined) return undefined;
    const trimmed = changes.scientificName.trim();
    if (!trimmed)
      throw new InvalidArgumentException(
        'identity.scientificName cannot be empty'
      );
    return trimmed;
  }

  private resolveIdentityFamily(
    changes: PlantIdentityChanges
  ): PlantProps['identity']['family'] {
    if (changes.family === undefined) return this.props.identity.family;
    const trimmed = changes.family.trim();
    if (!trimmed)
      throw new InvalidArgumentException('identity.family cannot be empty');
    return createFamilyId(trimmed);
  }

  updateIdentity(
    changes: PlantIdentityChanges,
    user: string,
    at: Date = new Date()
  ): void {
    this.assertActive();

    const primary = this.resolveIdentityPrimary(changes);
    const scientificName = this.resolveIdentityScientificName(changes);
    const aliases = changes.name?.aliases?.map((a) => a.trim()).filter(Boolean);
    const family = this.resolveIdentityFamily(changes);

    const identity = {
      ...this.props.identity,
      name: {
        ...this.props.identity.name,
        ...(primary !== undefined && { primary }),
        ...(aliases !== undefined && { aliases })
      },
      ...(scientificName !== undefined && { scientificName }),
      family
    };

    if (!hasStateChanged({ identity: this.props.identity }, { identity }))
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

    const traits = { lifecycle, spacingCm, size: { height, spread } };

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
      spread: traits.size.spread.toPrimitives()
    };
  }

  private resolveStarterDepth(
    sc: PlantSowingChanges,
    cur: PlantSowing
  ): Range | undefined {
    if (!sc.methods?.starter?.depthCm) return cur.methods.starter?.depthCm;
    if (cur.methods.starter?.depthCm) {
      return cur.methods.starter.depthCm.with(sc.methods.starter.depthCm);
    }
    return Range.fromPartial(
      sc.methods.starter.depthCm,
      'phenology.sowing.methods.starter.depthCm'
    );
  }

  private buildSowing(sc: PlantSowingChanges, cur: PlantSowing): PlantSowing {
    const months = sc.months ? MonthSet.fromArray(sc.months) : cur.months;
    const seedsPerHole = sc.seedsPerHole
      ? cur.seedsPerHole.with(sc.seedsPerHole)
      : cur.seedsPerHole;
    const germinationDays = sc.germinationDays
      ? cur.germinationDays.with(sc.germinationDays)
      : cur.germinationDays;
    const directDepth = sc.methods?.direct?.depthCm
      ? cur.methods.direct.depthCm.with(sc.methods.direct.depthCm)
      : cur.methods.direct.depthCm;
    const starterDepth = this.resolveStarterDepth(sc, cur);

    return new PlantSowing({
      months,
      seedsPerHole,
      germinationDays,
      methods: {
        direct: { depthCm: directDepth },
        ...(starterDepth !== undefined && {
          starter: { depthCm: starterDepth }
        })
      }
    });
  }

  updatePhenology(
    changes: PlantPhenologyChanges,
    user: string,
    at: Date = new Date()
  ): void {
    this.assertActive();

    if (!changes.sowing) return;

    const cur = this.props.phenology.sowing;
    const sowing = this.buildSowing(changes.sowing, cur);

    if (!hasStateChanged(cur.toPrimitives(), sowing.toPrimitives())) return;

    this.commit({ phenology: { ...this.props.phenology, sowing } }, user, at);
  }

  updateKnowledge(
    changes: PlantKnowledgeChanges,
    user: string,
    at: Date = new Date()
  ): void {
    this.assertActive();

    const knowledge = (this.props.knowledge ?? PlantKnowledge.empty()).update(
      changes
    );

    if (
      !hasStateChanged(
        { knowledge: this.props.knowledge?.toPrimitives() },
        { knowledge: knowledge.toPrimitives() }
      )
    )
      return;

    this.commit({ knowledge }, user, at);
  }

  static create(props: PlantProps): Plant {
    return new Plant({
      ...props,
      knowledge: props.knowledge ?? PlantKnowledge.empty()
    });
  }
}
