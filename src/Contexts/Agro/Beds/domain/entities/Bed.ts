import { hasStateChanged } from '../../../../../shared/domain/diff/hasStateChanged.js';
import type { UserId } from '../../../../Auth/domain/UserId.js';
import { AggregateRoot } from '../../../../shared/domain/entities/AggregateRoot.js';
import {
  DomainConflictException,
  InvalidArgumentException
} from '../../../../shared/domain/errors/index.js';
import {
  type WriteOutcome,
  versionAfter
} from '../../../../shared/domain/repositories/WriteOutcome.js';
import { Metadata } from '../../../../shared/domain/valueObject/Metadata.js';
import { PositiveNumber } from '../../../../shared/domain/valueObject/PositiveNumber.js';
import type { BedId } from '../BedId.js';
import { BedName } from '../BedName.js';
import type { BedDimensionsChanges } from './types/BedDimensionsChanges.js';
import type { BedProps } from './types/BedProps.js';

type BedState = BedProps & { version: number };

export class Bed extends AggregateRoot<BedId> {
  private props: Readonly<BedState>;

  constructor(props: BedProps) {
    super(props.id);

    this.props = Object.freeze({
      ...props,
      version: props.version ?? 0
    });
  }

  get name(): BedName {
    return this.props.name;
  }

  get width(): PositiveNumber {
    return this.props.width;
  }

  get height(): PositiveNumber {
    return this.props.height;
  }

  get depth(): PositiveNumber {
    return this.props.depth;
  }

  get metadata(): Metadata {
    return this.props.metadata;
  }

  get isDeleted(): boolean {
    return this.props.deleted;
  }

  get deletedAt(): Date | undefined {
    return this.props.deletedAt;
  }

  get userId(): UserId {
    return this.props.userId;
  }

  get version(): number {
    return this.props.version;
  }

  syncVersion(outcome: WriteOutcome): void {
    this.props = Object.freeze({
      ...this.props,
      version: versionAfter(this.props.version, outcome)
    });
  }

  rename(name: string, user: string, at: Date = new Date()): void {
    if (this.isDeleted) {
      throw new DomainConflictException('Cannot rename a deleted bed');
    }
    const next = new BedName(name);

    if (!hasStateChanged({ name: this.props.name.value }, { name: next.value }))
      return;

    this.commit({ name: next }, user, at);
  }

  resize(
    changes: BedDimensionsChanges,
    user: string,
    at: Date = new Date()
  ): void {
    if (this.isDeleted) {
      throw new DomainConflictException('Cannot resize a deleted bed');
    }

    const width =
      changes.width !== undefined
        ? this.buildDimension(changes.width, 'width')
        : this.props.width;
    const height =
      changes.height !== undefined
        ? this.buildDimension(changes.height, 'height')
        : this.props.height;
    const depth =
      changes.depth !== undefined
        ? this.buildDimension(changes.depth, 'depth')
        : this.props.depth;

    const before = {
      width: this.props.width.value,
      height: this.props.height.value,
      depth: this.props.depth.value
    };
    const after = {
      width: width.value,
      height: height.value,
      depth: depth.value
    };

    if (!hasStateChanged(before, after)) return;

    this.commit({ width, height, depth }, user, at);
  }

  markAsDeleted(user: string, at: Date = new Date()): void {
    if (this.isDeleted) {
      throw new DomainConflictException('Bed is already deleted');
    }

    this.commit({ deleted: true, deletedAt: at }, user, at);
  }

  static create(props: BedProps): Bed {
    return new Bed(props);
  }

  private commit(changes: Partial<BedProps>, user: string, at: Date): void {
    this.props = Object.freeze({
      ...this.props,
      ...changes,
      metadata: Metadata.update(this.props.metadata, user, at)
    });
  }

  private buildDimension(value: number, field: string): PositiveNumber {
    try {
      return PositiveNumber.create(value);
    } catch {
      throw new InvalidArgumentException(
        `Bed.${field} must be a positive number`
      );
    }
  }
}
