import { requireVerifiedAuthenticatedUser } from '@/lib/auth/guards';
import { getEntryService } from '@/lib/entries/runtime';
import { getBaseDataService } from '@/lib/base-data/runtime';
import type { Entry } from '@/lib/entries';
import { getFixedExpenseService } from '@/lib/fixed-expenses/runtime';
import { fixedExpenseSignature } from '@/lib/fixed-expenses/signature';
import {
  StatementView,
  type StatementEntry,
} from '@/components/statement/StatementView';

export const dynamic = 'force-dynamic';

const MONTH_PARAM_PATTERN = /^(\d{4})-(\d{2})$/;

export default async function StatementPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; entry?: string }>;
}) {
  const user = await requireVerifiedAuthenticatedUser();
  const [entryService, baseDataService, fixedExpenseService] = await Promise.all([
    getEntryService(),
    getBaseDataService(),
    getFixedExpenseService(),
  ]);

  const months = await entryService.listAvailableMonths(user.id);
  const { month, entry } = await searchParams;
  const selectedMonth = resolveSelectedMonth(month, months);

  const [entries, baseData, signatures] = await Promise.all([
    entryService.listMonthlyStatement(user.id, selectedMonth),
    baseDataService.getBaseData(user.id),
    fixedExpenseService.listSignatures(user.id),
  ]);

  // With base data set, show the running balance (baseline + accumulated net).
  const balance = baseData
    ? await entryService.computeMonthBalance(
        user.id,
        baseData.baseMonth,
        baseData.baselineTotal,
        selectedMonth
      )
    : null;

  // Derive `isFixed` per row: any entry whose signature is marked is fixed —
  // including rows that first appeared in this month's import.
  const fixedSignatures = new Set(signatures.map((item) => item.signature));
  const decoratedEntries: StatementEntry[] = entries.map((item) => ({
    ...item,
    isFixed: fixedSignatures.has(
      fixedExpenseSignature(item.merchant, item.description)
    ),
  }));

  return (
    <StatementView
      months={months}
      selectedMonth={selectedMonth}
      entries={decoratedEntries}
      highlightEntryId={entry ?? null}
      baseData={baseData}
      startingBalance={balance?.startingBalance ?? null}
      endingBalance={balance?.endingBalance ?? null}
    />
  );
}

function resolveSelectedMonth(
  param: string | undefined,
  months: Entry.MonthOption[]
): Entry.MonthOption {
  const match = param ? MONTH_PARAM_PATTERN.exec(param) : null;
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (month >= 1 && month <= 12) {
      return { year, month };
    }
  }

  if (months.length > 0) {
    return months[0];
  }

  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}
