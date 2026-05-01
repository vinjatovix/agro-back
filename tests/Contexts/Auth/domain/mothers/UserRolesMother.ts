import { UserRoles } from "../../../../../src/Contexts/Auth/domain/value-objects/UserRoles.js";
import { random } from "../../../shared/fixtures/index.js";

export class UserRolesMother {
  static create(value: string[]) {
    return new UserRoles(value);
  }

  static random() {
    return this.create([`${random.arrayElement(['admin', 'user'])}`]);
  }
}
