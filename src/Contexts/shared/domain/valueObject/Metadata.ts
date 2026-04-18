import type { MetadataType } from '../../infrastructure/persistence/mongo/types/MetadataType.js';

export class Metadata {
  readonly createdAt?: Date;
  readonly createdBy?: string;
  readonly updatedAt: Date;
  readonly updatedBy: string;

  constructor({ createdAt, createdBy, updatedAt, updatedBy }: MetadataType) {
    if (createdAt !== undefined) {
      this.createdAt = createdAt;
    }

    if (createdBy !== undefined) {
      this.createdBy = createdBy;
    }

    this.updatedAt = updatedAt;
    this.updatedBy = updatedBy;
  }

  toPrimitives(): MetadataType {
    const primitives: MetadataType = {
      updatedAt: this.updatedAt,
      updatedBy: this.updatedBy
    };

    if (this.createdAt !== undefined) {
      primitives.createdAt = this.createdAt;
    }

    if (this.createdBy !== undefined) {
      primitives.createdBy = this.createdBy;
    }

    return primitives;
  }

  static fromPrimitives({
    createdAt,
    createdBy,
    updatedAt,
    updatedBy
  }: MetadataType): Metadata {
    const metadata: MetadataType = { updatedAt, updatedBy };

    if (createdAt !== undefined) {
      metadata.createdAt = createdAt;
    }

    if (createdBy !== undefined) {
      metadata.createdBy = createdBy;
    }

    return new Metadata(metadata);
  }
}
