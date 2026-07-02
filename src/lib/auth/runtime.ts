import 'server-only';

import { createMongoAuthRepository } from '@/lib/auth/mongodb-repository';
import { createAuthService } from '@/lib/auth/service';
import { instrument } from '@/lib/observability/instrument';

type AuthService = ReturnType<typeof createAuthService>;

declare global {
  var __authServicePromise__: Promise<AuthService> | undefined;
}

export function getAuthService(): Promise<AuthService> {
  if (!globalThis.__authServicePromise__) {
    globalThis.__authServicePromise__ = createMongoAuthRepository().then(
      (repository) => instrument(createAuthService(repository), { domain: 'auth' })
    );
  }

  return globalThis.__authServicePromise__;
}
