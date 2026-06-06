import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import MuiLink from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { requireVerifiedAuthenticatedUser } from '@/lib/auth/guards';
import { getEntryService } from '@/lib/entries/runtime';
import { getBaseDataService } from '@/lib/base-data/runtime';
import OutcomesByCategoryChart from '@/components/dashboard/OutcomesByCategoryChart';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await requireVerifiedAuthenticatedUser();
  const [entryService, baseDataService] = await Promise.all([
    getEntryService(),
    getBaseDataService(),
  ]);

  const baseData = await baseDataService.getBaseData(user.id);

  // Current balance = baseline + accumulated net through the current month.
  const now = new Date();
  const currentMonth = {
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
  };
  const [currentBalance, outcomesByCategory] = await Promise.all([
    baseData
      ? entryService
          .computeMonthBalance(
            user.id,
            baseData.baseMonth,
            baseData.baselineTotal,
            currentMonth
          )
          .then((b) => b.endingBalance)
      : Promise.resolve(null),
    entryService.getMonthlyOutcomesByCategory(user.id, currentMonth),
  ]);

  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 8 } }}>
      <Stack spacing={4}>
        <Stack spacing={1}>
          <Typography variant="overline" color="primary.dark">
            Dashboard
          </Typography>
          <Typography variant="h4" component="h1" color="text.primary">
            Welcome back
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Here&apos;s an overview of your finances.
          </Typography>
        </Stack>

        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent>
            <Stack spacing={1}>
              <Typography variant="overline" color="text.secondary">
                Current balance
              </Typography>
              {currentBalance !== null ? (
                <Typography
                  sx={{
                    fontFamily:
                      'var(--font-roboto-mono), "Roboto Mono", monospace',
                    fontWeight: 700,
                    fontSize: 32,
                    color: currentBalance >= 0 ? 'success.dark' : 'error.main',
                  }}
                >
                  {formatBalance(currentBalance / 100, 'BRL')}
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Set your base month and opening balance on the{' '}
                  <MuiLink href="/dashboard/statement">Statement page</MuiLink> to
                  see your running balance here.
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent>
            <OutcomesByCategoryChart
              data={outcomesByCategory}
              month={currentMonth}
            />
          </CardContent>
        </Card>

        <Card
          sx={{
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <CardContent>
            <Stack spacing={1.5}>
              <Typography variant="h6" component="h2" color="text.primary">
                Account
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user.emailDisplay}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Status: {user.status}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
}

// A running balance in centavos-derived reais: plain currency, minus only when negative.
function formatBalance(amount: number, currency: string): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(amount);
}
