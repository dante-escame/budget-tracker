import { requireVerifiedAuthenticatedUser } from '@/lib/auth/guards';
import { getEntryService } from '@/lib/entries/runtime';
import type { Entry } from '@/lib/entries';
import { PrevisionsView } from '@/components/previsions/PrevisionsView';

export const dynamic = 'force-dynamic';

const MONTH_PARAM_PATTERN = /^(\d{4})-(\d{2})$/;

export default async function PrevisionsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireVerifiedAuthenticatedUser();
  const entryService = await getEntryService();

  const { month } = await searchParams;
  const selectedMonth = resolveSelectedMonth(month);

  const [outcomesByCategory, entries, expectedIncome] = await Promise.all([
    entryService.getMonthlyOutcomesByCategory(user.id, selectedMonth),
    entryService.listMonthlyStatement(user.id, selectedMonth),
    entryService.getExpectedMonthlyIncome(user.id),
  ]);

  return (
    <PrevisionsView
      selectedMonth={selectedMonth}
      outcomesByCategory={outcomesByCategory}
      entries={entries}
      expectedIncome={expectedIncome}
    />
  );
}

// The selected month from the URL param, or the next calendar month (relative
// to the current UTC date) when absent or malformed.
function resolveSelectedMonth(param: string | undefined): Entry.MonthOption {
  const match = param ? MONTH_PARAM_PATTERN.exec(param) : null;
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (month >= 1 && month <= 12) {
      return { year, month };
    }
  }

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1; // 1-12 for the current month
  return month === 12
    ? { year: year + 1, month: 1 }
    : { year, month: month + 1 };
}
