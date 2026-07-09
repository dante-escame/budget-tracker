import 'server-only';

import { createMongoCreditCardRepository } from '@/lib/credit-cards/mongodb-repository';
import { createCreditCardService } from '@/lib/credit-cards/service';
import { instrument } from '@/lib/observability/instrument';

type CreditCardService = ReturnType<typeof createCreditCardService>;

declare global {
  var __creditCardServicePromise__: Promise<CreditCardService> | undefined;
}

export function getCreditCardService(): Promise<CreditCardService> {
  if (!globalThis.__creditCardServicePromise__) {
    globalThis.__creditCardServicePromise__ = createMongoCreditCardRepository().then(
      (repository) =>
        instrument(createCreditCardService(repository), {
          domain: 'credit-cards',
          userIdArg: 0,
        })
    );
  }

  return globalThis.__creditCardServicePromise__;
}
