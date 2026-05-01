import type { MetadataPrimitives } from '../../infrastructure/persistence/mongo/types/index.js';
import type { Serializable } from '../interfaces/Serializable.js';

export class Metadata implements Serializable<MetadataPrimitives> {
  private constructor(
    public readonly createdAt: Date,
    public readonly createdBy: string,
    public readonly updatedAt: Date,
    public readonly updatedBy: string
  ) {}

  static create(user: string): Metadata {
    const now = new Date();

    return new Metadata(now, user, now, user);
  }

  static update(previous: Metadata, user: string): Metadata {
    return new Metadata(
      previous.createdAt,
      previous.createdBy,
      new Date(),
      user
    );
  }

  static fromPrimitives(p: MetadataPrimitives): Metadata {
    return new Metadata(
      new Date(p.createdAt),
      p.createdBy,
      new Date(p.updatedAt),
      p.updatedBy
    );
  }

  toPrimitives(): MetadataPrimitives {
    return {
      createdAt: this.createdAt,
      createdBy: this.createdBy,
      updatedAt: this.updatedAt,
      updatedBy: this.updatedBy
    };
  }
}
