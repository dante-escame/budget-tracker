import { requireVerifiedAuthenticatedUser } from '@/lib/auth/guards';
import { getEntryService } from '@/lib/entries/runtime';
import { getBaseDataService } from '@/lib/base-data/runtime';
import type { Entry } from '@/lib/entries';
import { StatementView } from '@/components/statement/StatementView';

export const dynamic = 'force-dynamic';

const MONTH_PARAM_PATTERN = /^(\d{4})-(\d{2})$/;

export default async function StatementPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; entry?: string }>;
}) {
  const user = await requireVerifiedAuthenticatedUser();
  const [entryService, baseDataService] = await Promise.all([
    getEntryService(),
    getBaseDataService(),
  ]);

  const months = await entryService.listAvailableMonths(user.id);
  const { month, entry } = await searchParams;
  const selectedMonth = resolveSelectedMonth(month, months);

  const [entries, baseData] = await Promise.all([
    entryService.listMonthlyStatement(user.id, selectedMonth),
    baseDataService.getBaseData(user.id),
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

  return (
    <StatementView
      months={months}
      selectedMonth={selectedMonth}
      entries={entries}
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
