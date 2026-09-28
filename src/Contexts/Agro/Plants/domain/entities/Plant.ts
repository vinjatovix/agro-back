import { deepFreeze } from '../../../../../shared/domain/utils/deepFreeze.js';
import { MonthSet } from '../../../../../shared/domain/value-objects/MonthSet.js';
import { Range } from '../../../../../shared/domain/value-objects/Range.js';
import { AggregateRoot } from '../../../../shared/domain/entities/AggregateRoot.js';
import {
  DomainConflictException,
  InvalidArgumentException
} from '../../../../shared/domain/errors/index.js';
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

  markAsDeleted(): void {
    if (this.isDeleted()) return;

    this.props = deepFreeze({
      ...this.props,
      status: PlantStatus.DELETED,
      deletedAt: new Date()
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

  updateIdentity(changes: PlantIdentityChanges): void {
    this.assertActive();

    const primary = this.resolveIdentityPrimary(changes);
    const scientificName = this.resolveIdentityScientificName(changes);
    const aliases = changes.name?.aliases?.map((a) => a.trim()).filter(Boolean);
    const family = this.resolveIdentityFamily(changes);

    this.props = deepFreeze({
      ...this.props,
      identity: {
        ...this.props.identity,
        name: {
          ...this.props.identity.name,
          ...(primary !== undefined && { primary }),
          ...(aliases !== undefined && { aliases })
        },
        ...(scientificName !== undefined && { scientificName }),
        family
      }
    });
  }

  updateTraits(changes: PlantTraitsChanges): void {
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

    this.props = deepFreeze({
      ...this.props,
      traits: { lifecycle, spacingCm, size: { height, spread } }
    });
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

  updatePhenology(changes: PlantPhenologyChanges): void {
    this.assertActive();

    if (!changes.sowing) return;

    const sc = changes.sowing;
    const cur = this.props.phenology.sowing;

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

    const sowing = new PlantSowing({
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

    this.props = deepFreeze({
      ...this.props,
      phenology: { ...this.props.phenology, sowing }
    });
  }

  updateKnowledge(changes: PlantKnowledgeChanges): void {
    this.assertActive();

    const knowledge = (this.props.knowledge ?? PlantKnowledge.empty()).update(
      changes
    );

    this.props = deepFreeze({ ...this.props, knowledge });
  }

  static create(props: PlantProps): Plant {
    return new Plant({
      ...props,
      knowledge: props.knowledge ?? PlantKnowledge.empty()
    });
  }
}
