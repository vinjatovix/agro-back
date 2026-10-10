import { hasStateChanged } from '../../../../../shared/domain/diff/hasStateChanged.js';
import { patchField } from '../../../../../shared/domain/utils/patchField.js';
import { Coordinates } from '../../../../../shared/domain/value-objects/index.js';
import { createUserId, type UserId } from '../../../../Auth/domain/UserId.js';
import { AggregateRoot } from '../../../../shared/domain/entities/AggregateRoot.js';
import {
  DomainConflictException,
  InvalidArgumentException
} from '../../../../shared/domain/errors/index.js';
import type { Serializable } from '../../../../shared/domain/interfaces/Serializable.js';
import {
  type WriteOutcome,
  versionAfter
} from '../../../../shared/domain/repositories/WriteOutcome.js';
import { Metadata } from '../../../../shared/domain/valueObject/Metadata.js';
import { createBedId, type BedId } from '../../../Beds/domain/BedId.js';
import { createPlantId, type PlantId } from '../../../Plants/domain/PlantId.js';
import {
  createPlantInstanceId,
  type PlantInstanceId
} from '../PlantInstanceId.js';
import {
  type CropGrowthStatus,
  PlantInstanceLifecycleStatus,
  type PlantInstanceDetailChanges,
  type PlantInstancePrimitives,
  type PlantInstanceProps
} from './types/index.js';

type PlantInstanceState = PlantInstanceProps & { version: number };
type PlantInstanceMutationChanges = Partial<
  Omit<
    PlantInstanceProps,
    'id' | 'userId' | 'bedId' | 'plantId' | 'metadata' | 'version'
  >
>;

export class PlantInstance
  extends AggregateRoot<PlantInstanceId>
  implements Serializable<PlantInstancePrimitives>
{
  private props: Readonly<PlantInstanceState>;

  constructor(props: PlantInstanceProps) {
    super(props.id);
    this.assertInvariants(props);

    this.props = Object.freeze({
      ...props,
      version: props.version ?? 0
    });
  }

  get userId(): UserId {
    return this.props.userId;
  }

  get bedId(): BedId {
    return this.props.bedId;
  }

  get plantId(): PlantId {
    return this.props.plantId;
  }

  get position(): Coordinates | undefined {
    return this.props.position;
  }

  get growthStatus(): CropGrowthStatus {
    return this.props.growthStatus;
  }

  get instanceStatus(): PlantInstanceLifecycleStatus {
    return this.props.instanceStatus;
  }

  get plantedAt(): Date {
    return this.props.plantedAt;
  }

  get removedAt(): Date | undefined {
    return this.props.removedAt;
  }

  get variety(): string | undefined {
    return this.props.variety;
  }

  get notes(): string | undefined {
    return this.props.notes;
  }

  get metadata(): Metadata {
    return this.props.metadata;
  }

  get version(): number {
    return this.props.version;
  }

  /** PATCH semantics: `undefined` keeps a field, `null` clears it. */
  updateDetails(
    changes: PlantInstanceDetailChanges,
    actingUser: string,
    at: Date = new Date()
  ): void {
    if (this.props.instanceStatus === PlantInstanceLifecycleStatus.REMOVED) {
      throw new DomainConflictException(
        'Cannot update a removed plant instance'
      );
    }

    this.assertVariety(changes.variety ?? undefined);
    this.assertNotes(changes.notes ?? undefined);

    const before = {
      growthStatus: this.props.growthStatus,
      variety: this.props.variety,
      notes: this.props.notes
    };
    const after = {
      growthStatus: changes.growthStatus ?? this.props.growthStatus,
      variety: patchField(changes.variety, this.props.variety),
      notes: patchField(changes.notes, this.props.notes)
    };

    if (!hasStateChanged(before, after)) {
      return;
    }

    this.commit(after, actingUser, at);
  }

  moveTo(
    newPosition: Coordinates,
    actingUser: string,
    at: Date = new Date()
  ): void {
    if (this.props.instanceStatus === PlantInstanceLifecycleStatus.REMOVED) {
      throw new DomainConflictException('Cannot move a removed plant instance');
    }

    if (newPosition.x < 0 || newPosition.y < 0) {
      throw new InvalidArgumentException(
        'PlantInstance coordinates must be non-negative'
      );
    }

    const before = this.props.position
      ? { x: this.props.position.x, y: this.props.position.y }
      : {};
    const after = { x: newPosition.x, y: newPosition.y };

    if (!hasStateChanged(before, after)) {
      return;
    }

    this.commit({ position: newPosition }, actingUser, at);
  }

  markAsRemoved(actingUser: string, at: Date = new Date()): void {
    if (this.props.instanceStatus === PlantInstanceLifecycleStatus.REMOVED) {
      throw new DomainConflictException('Plant instance is already removed');
    }

    this.commit(
      {
        instanceStatus: PlantInstanceLifecycleStatus.REMOVED,
        removedAt: at
      },
      actingUser,
      at
    );
  }

  syncVersion(outcome: WriteOutcome): void {
    this.props = Object.freeze({
      ...this.props,
      version: versionAfter(this.props.version, outcome)
    });
  }

  toPrimitives(): PlantInstancePrimitives {
    const result: PlantInstancePrimitives = {
      id: this.props.id,
      userId: this.props.userId,
      bedId: this.props.bedId,
      plantId: this.props.plantId,
      growthStatus: this.props.growthStatus,
      instanceStatus: this.props.instanceStatus,
      plantedAt: this.props.plantedAt.toISOString(),
      metadata: this.props.metadata.toPrimitives(),
      version: this.props.version
    };

    if (this.props.position !== undefined) {
      result.position = this.props.position.toPrimitives();
    }

    if (this.props.removedAt !== undefined) {
      result.removedAt = this.props.removedAt.toISOString();
    }

    if (this.props.variety !== undefined) {
      result.variety = this.props.variety;
    }

    if (this.props.notes !== undefined) {
      result.notes = this.props.notes;
    }

    return result;
  }

  static create(props: PlantInstanceProps): PlantInstance {
    return new PlantInstance(props);
  }

  static fromPrimitives(p: PlantInstancePrimitives): PlantInstance {
    return new PlantInstance({
      id: createPlantInstanceId(p.id),
      userId: createUserId(p.userId),
      bedId: createBedId(p.bedId),
      plantId: createPlantId(p.plantId),
      position: p.position ? Coordinates.fromPrimitives(p.position) : undefined,
      growthStatus: p.growthStatus,
      instanceStatus: p.instanceStatus,
      plantedAt: new Date(p.plantedAt),
      ...(p.removedAt !== undefined && { removedAt: new Date(p.removedAt) }),
      ...(p.variety !== undefined && { variety: p.variety }),
      ...(p.notes !== undefined && { notes: p.notes }),
      metadata: Metadata.fromPrimitives(p.metadata),
      version: p.version
    });
  }

  private commit(
    changes: PlantInstanceMutationChanges,
    user: string,
    at: Date
  ): void {
    this.props = Object.freeze({
      ...this.props,
      ...changes,
      metadata: Metadata.update(this.props.metadata, user, at)
    });
  }

  private assertVariety(variety: string | undefined): void {
    if (variety !== undefined && (variety.length < 1 || variety.length > 100)) {
      throw new InvalidArgumentException(
        'Variety must be between 1 and 100 characters'
      );
    }
  }

  private assertNotes(notes: string | undefined): void {
    if (notes !== undefined && notes.length > 1000) {
      throw new InvalidArgumentException('Notes cannot exceed 1000 characters');
    }
  }

  private assertInvariants(props: PlantInstanceProps): void {
    this.assertLifecycleInvariants(props);
    this.assertCoordinatesInvariants(props.position);
    this.assertVariety(props.variety);
    this.assertNotes(props.notes);
  }

  private assertLifecycleInvariants(props: PlantInstanceProps): void {
    if (
      props.removedAt !== undefined &&
      props.instanceStatus !== PlantInstanceLifecycleStatus.REMOVED
    ) {
      throw new InvalidArgumentException(
        'Invalid PlantInstance: removedAt only allowed when instanceStatus is REMOVED'
      );
    }

    if (
      props.instanceStatus === PlantInstanceLifecycleStatus.REMOVED &&
      props.removedAt === undefined
    ) {
      throw new InvalidArgumentException(
        'Invalid PlantInstance: removedAt is required when instanceStatus is REMOVED'
      );
    }
  }

  private assertCoordinatesInvariants(position: Coordinates | undefined): void {
    if (position !== undefined && (position.x < 0 || position.y < 0)) {
      throw new InvalidArgumentException(
        'PlantInstance coordinates must be non-negative'
      );
    }
  }
}
