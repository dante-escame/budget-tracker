import { requireVerifiedAuthenticatedUser } from '@/lib/auth/guards';
import { getEntryService } from '@/lib/entries/runtime';
import type { Entry } from '@/lib/entries';
import { StatementView } from '@/components/statement/StatementView';

export const dynamic = 'force-dynamic';

const MONTH_PARAM_PATTERN = /^(\d{4})-(\d{2})$/;

export default async function StatementPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireVerifiedAuthenticatedUser();
  const entryService = await getEntryService();

  const months = await entryService.listAvailableMonths(user.id);
  const { month } = await searchParams;
  const selectedMonth = resolveSelectedMonth(month, months);

  const entries = await entryService.listMonthlyStatement(user.id, selectedMonth);

  return (
    <StatementView
      months={months}
      selectedMonth={selectedMonth}
      entries={entries}
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
