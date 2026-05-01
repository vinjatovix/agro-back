import { deepFreeze } from '../../../../../shared/domain/utils/deepFreeze.js';
import { createError } from '../../../../../shared/errors/index.js';
import { AggregateRoot } from '../../../../shared/domain/entities/AggregateRoot.js';
import { Metadata, Uuid } from '../../../../shared/domain/valueObject/index.js';
import { PlantKnowledge } from '../value-objects/index.js';
import { PlantStatus, type PlantProps } from './types/index.js';

export class Plant extends AggregateRoot<Uuid> {
  private readonly props: PlantProps;
  status: PlantStatus;
  deletedAt?: Date | undefined;

  constructor(props: PlantProps) {
    super(props.id);
    this.validateProps(props);
    this.props = deepFreeze(props);
    this.status = props.status ?? PlantStatus.ACTIVE;
    this.deletedAt = props.deletedAt;
  }

  private validateProps(props: PlantProps) {
    if (props.status === PlantStatus.ACTIVE && props.deletedAt) {
      throw createError.badRequest('Active plant cannot have deletedAt');
    }
    if (props.status === PlantStatus.DELETED && !props.deletedAt) {
      throw createError.badRequest('Deleted plant must have deletedAt');
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

  isDeleted(): boolean {
    return this.status === PlantStatus.DELETED;
  }

  markAsDeleted(): void {
    if (this.isDeleted()) return;

    this.status = PlantStatus.DELETED;
    this.deletedAt = new Date();
  }

  static create(props: PlantProps): Plant {
    return new Plant({
      ...props,
      knowledge: props.knowledge ?? PlantKnowledge.empty()
    });
  }
}
