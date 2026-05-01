import { DateValueObject } from '../../../../../src/Contexts/shared/domain/valueObject/DateValueObject.js';

describe('DateValueObject', () => {
  it('should create a valid date value object from an ISO string', () => {
    const isoDate = '2026-01-10T12:30:00.000Z';

    const valueObject = new DateValueObject(isoDate);

    expect(valueObject.value).toBeInstanceOf(Date);
    expect(valueObject.value.toISOString()).toBe(isoDate);
  });

  it('should trim input before parsing', () => {
    const valueObject = new DateValueObject(' 2026-01-10T12:30:00.000Z ');

    expect(valueObject.value.toISOString()).toBe('2026-01-10T12:30:00.000Z');
  });

  it('should throw for an invalid date', () => {
    expect(() => new DateValueObject('not-a-date')).toThrow(
      '<DateValueObject> does not allow the value <not-a-date>'
    );
  });
});
