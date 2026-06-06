import 'server-only';

import { createMongoCreditCardRepository } from '@/lib/credit-cards/mongodb-repository';
import { createCreditCardService } from '@/lib/credit-cards/service';

type CreditCardService = ReturnType<typeof createCreditCardService>;

declare global {
  var __creditCardServicePromise__: Promise<CreditCardService> | undefined;
}

export function getCreditCardService(): Promise<CreditCardService> {
  if (!globalThis.__creditCardServicePromise__) {
    globalThis.__creditCardServicePromise__ = createMongoCreditCardRepository().then(
      (repository) => createCreditCardService(repository)
    );
  }

  return globalThis.__creditCardServicePromise__;
}
