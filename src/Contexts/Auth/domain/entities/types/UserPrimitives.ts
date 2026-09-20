import type { MetadataPrimitives } from '../../../../shared/domain/MetadataPrimitives.js';
import type { UserAuthMethodPrimitives } from '../../value-objects/types/UserAuthMethodPrimitives.js';

export interface UserPrimitives {
  id: string;
  email: string;
  username: string;
  password?: string;
  emailValidated: boolean;
  authMethods: UserAuthMethodPrimitives[];
  roles: string[];
  metadata: MetadataPrimitives;
}
