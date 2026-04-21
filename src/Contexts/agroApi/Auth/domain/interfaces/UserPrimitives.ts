import type { MetadataPrimitives } from '../../../../shared/infrastructure/persistence/mongo/types/MetadataPrimitives.js';
import type { UserAuthMethodPrimitives } from '../UserAuthMethod.js';

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
