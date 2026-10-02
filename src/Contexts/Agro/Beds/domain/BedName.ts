import { requiredText } from '../../../../shared/domain/utils/requiredText.js';
import { StringValueObject } from '../../../shared/domain/valueObject/StringValueObject.js';

/** A bed's name: trimmed and never blank, whether created, renamed or loaded. */
export class BedName extends StringValueObject {
  constructor(value: string) {
    super(requiredText(BedName.ensureType(value), 'Bed.name'));
  }
}
