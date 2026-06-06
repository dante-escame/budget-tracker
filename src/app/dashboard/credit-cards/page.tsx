import { requireVerifiedAuthenticatedUser } from '@/lib/auth/guards';
import { getCreditCardService } from '@/lib/credit-cards/runtime';
import type { CreditCard } from '@/lib/credit-cards';
import type { Entry } from '@/lib/entries';
import { CreditCardsView } from '@/components/credit-cards/CreditCardsView';

export const dynamic = 'force-dynamic';

const MONTH_PARAM_PATTERN = /^(\d{4})-(\d{2})$/;

export default async function CreditCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ card?: string; month?: string }>;
}) {
  const user = await requireVerifiedAuthenticatedUser();
  const service = await getCreditCardService();

  const bills = await service.listBills(user.id);
  const { card, month } = await searchParams;
  const selection = resolveSelection(card, month, bills);

  let bill: CreditCard.BillRecord | null = null;
  let entries: Entry.Record[] = [];
  if (selection) {
    const result = await service.getBill(
      user.id,
      selection.cardLabel,
      selection.month
    );
    if (result) {
      bill = result.bill;
      entries = result.entries;
    }
  }

  return (
    <CreditCardsView
      bills={bills}
      selectedCard={selection?.cardLabel ?? null}
      selectedMonth={selection?.month ?? null}
      bill={bill}
      entries={entries}
    />
  );
}

function resolveSelection(
  cardParam: string | undefined,
  monthParam: string | undefined,
  bills: CreditCard.BillSummary[]
): { cardLabel: string; month: CreditCard.MonthOption } | null {
  if (bills.length === 0) return null;

  const cardLabel =
    cardParam && bills.some((b) => b.cardLabel === cardParam)
      ? cardParam
      : bills[0].cardLabel;

  const cardBills = bills.filter((b) => b.cardLabel === cardLabel);
  const parsedMonth = parseMonthParam(monthParam);
  const month =
    (parsedMonth &&
      cardBills.find(
        (b) =>
          b.competence.year === parsedMonth.year &&
          b.competence.month === parsedMonth.month
      )?.competence) ??
    cardBills[0].competence;

  return { cardLabel, month };
}

function parseMonthParam(
  param: string | undefined
): CreditCard.MonthOption | null {
  const match = param ? MONTH_PARAM_PATTERN.exec(param) : null;
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}
