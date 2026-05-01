import { createError } from '../../../../shared/errors/index.js';

export class DateValueObject {
  readonly value: Date;

  constructor(value: string) {
    const normalizedValue = DateValueObject.normalize(value);
    this.value = DateValueObject.parseDate(normalizedValue);
  }

  private static normalize(value: string): string {
    return value.trim();
  }

  private static parseDate(value: string): Date {
    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      throw createError.badRequest(
        `<DateValueObject> does not allow the value <${value}>`
      );
    }

    return parsedDate;
  }
}
