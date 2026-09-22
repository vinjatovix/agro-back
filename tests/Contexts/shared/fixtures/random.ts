import Chance from 'chance';
import { v4 as uuidv4, v7 as uuidv7 } from 'uuid';

class Random {
  private readonly chance: Chance.Chance;

  constructor() {
    this.chance = new Chance();
  }

  public arrayElement<T>(array: readonly T[]): T {
    return this.chance.pickone(array);
  }

  public boolean(): boolean {
    return this.chance.bool();
  }

  public description(words: number = 5, toLowerCase: boolean = false): string {
    const description = this.chance.sentence({ words });
    return toLowerCase ? description.toLowerCase() : description;
  }

  public integer(options?: Chance.IntegerOptions): number {
    return this.chance.integer(options ?? {});
  }

  public name(toLowerCase: boolean = false): string {
    const name = this.chance.sentence().replaceAll(/\s|\./g, '-');

    return toLowerCase ? name.toLowerCase() : name;
  }

  public uuid(): string {
    return uuidv7();
  }

  public legacyUuid(): string {
    return uuidv4();
  }

  public guid(): string {
    return this.uuid();
  }

  public url(): string {
    return this.chance.url();
  }

  public word({
    min = 0,
    max = 256
  }: { min?: number; max?: number } = {}): string {
    return this.chance.word({
      length: Math.floor(Math.random() * (max - min + 1) + min)
    });
  }

  public color(options?: Chance.Options): string {
    return this.chance.color(options ?? {});
  }

  public date(options?: Chance.DateOptions): Date | string {
    const date = this.chance.date(options ?? {});

    return new Date(date);
  }

  public email(): string {
    return this.chance.email();
  }
}

const random: Random = new Random();

export { random };
