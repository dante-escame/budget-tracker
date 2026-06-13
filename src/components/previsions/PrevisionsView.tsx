'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import FormControl from '@mui/material/FormControl';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { CATEGORY_LABELS } from '@/lib/entries/categories';
import type { Entry } from '@/lib/entries';
import OutcomesByCategoryChart from '@/components/dashboard/OutcomesByCategoryChart';

interface OutcomeByCategory {
  category: Entry.Category;
  label: string;
  total: number;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CURRENT_YEAR = new Date().getUTCFullYear();
const YEARS = Array.from({ length: 11 }, (_, i) => CURRENT_YEAR - 5 + i);

export function PrevisionsView({
  selectedMonth,
  outcomesByCategory,
  entries,
  expectedIncome,
}: {
  selectedMonth: Entry.MonthOption;
  outcomesByCategory: OutcomeByCategory[];
  entries: Entry.Record[];
  expectedIncome: number;
}) {
  const router = useRouter();

  // Income lives as a plain reais string so the user can freely edit it; it is
  // re-synced whenever the server-provided pre-fill changes (e.g. a reload).
  const [income, setIncome] = useState(() => toReaisInput(expectedIncome));
  const [syncedIncome, setSyncedIncome] = useState(expectedIncome);
  if (syncedIncome !== expectedIncome) {
    setSyncedIncome(expectedIncome);
    setIncome(toReaisInput(expectedIncome));
  }

  // Drop cancelled entries; everything else that exists for the month counts.
  const monthEntries = useMemo(
    () => entries.filter((entry) => entry.status !== 'cancelled'),
    [entries]
  );

  const totalOutcomes = useMemo(
    () =>
      monthEntries.reduce(
        (sum, entry) => (entry.flow === 'outcome' ? sum + entry.value : sum),
        0
      ),
    [monthEntries]
  );

  // Blank/invalid income reads as 0 (centavos).
  const projectedIncome = useMemo(() => parseReaisToCentavos(income), [income]);
  const projectedNet = projectedIncome - totalOutcomes;

  function handleMonthChange(year: number, month: number) {
    const value = `${year}-${String(month).padStart(2, '0')}`;
    router.push(`/dashboard/previsions?month=${value}`);
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 8 } }}>
      <Stack spacing={4}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', sm: 'center' },
          }}
        >
          <Stack spacing={1}>
            <Typography variant="overline" color="primary.dark">
              Planning
            </Typography>
            <Typography variant="h4" component="h1" color="text.primary">
              Next Month
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Preview your projected income against the outcomes already
              committed to {toMonthLabel(selectedMonth)}.
            </Typography>
          </Stack>

          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Month</InputLabel>
              <Select
                label="Month"
                value={selectedMonth.month}
                onChange={(e) =>
                  handleMonthChange(selectedMonth.year, e.target.value as number)
                }
              >
                {MONTH_NAMES.map((name, i) => (
                  <MenuItem key={i + 1} value={i + 1}>{name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Year</InputLabel>
              <Select
                label="Year"
                value={selectedMonth.year}
                onChange={(e) =>
                  handleMonthChange(e.target.value as number, selectedMonth.month)
                }
              >
                {YEARS.map((year) => (
                  <MenuItem key={year} value={year}>{year}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </Stack>

        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent>
            <Stack spacing={3}>
              <Stack spacing={1}>
                <Typography variant="overline" color="text.secondary">
                  Expected monthly income
                </Typography>
                <TextField
                  value={income}
                  onChange={(event) => setIncome(event.target.value)}
                  placeholder="0.00"
                  helperText="Pre-filled from your average early-month income over the last 4 months. Override to plan ahead."
                  sx={{ maxWidth: 280 }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">R$</InputAdornment>
                      ),
                    },
                  }}
                />
              </Stack>

              <Stack spacing={1}>
                <Typography variant="overline" color="text.secondary">
                  Projected net balance
                </Typography>
                <Typography
                  sx={{
                    fontFamily:
                      'var(--font-roboto-mono), "Roboto Mono", monospace',
                    fontWeight: 700,
                    fontSize: 32,
                    color: projectedNet >= 0 ? 'success.dark' : 'error.main',
                  }}
                >
                  {formatBalance(projectedNet / 100)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatBalance(projectedIncome / 100)} income −{' '}
                  {formatBalance(totalOutcomes / 100)} committed outcomes
                </Typography>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent>
            <OutcomesByCategoryChart
              data={outcomesByCategory}
              month={selectedMonth}
            />
          </CardContent>
        </Card>

        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent>
            <Typography
              variant="h6"
              component="h2"
              color="text.primary"
              sx={{ mb: 2 }}
            >
              Committed entries
            </Typography>
            {monthEntries.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No entries are committed to {toMonthLabel(selectedMonth)} yet.
              </Typography>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ borderColor: 'divider' }}>
                <Table size="small" aria-label="Committed entries">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'secondary.light' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        Amount
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {monthEntries.map((entry) => (
                      <TableRow key={entry.id} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {formatDate(entry.occurredAt)}
                        </TableCell>
                        <TableCell>{entry.shortDescription}</TableCell>
                        <TableCell>{CATEGORY_LABELS[entry.category]}</TableCell>
                        <TableCell>{toTypeLabel(entry.type)}</TableCell>
                        <TableCell align="right">
                          <Typography
                            component="span"
                            sx={{
                              fontFamily:
                                'var(--font-roboto-mono), "Roboto Mono", monospace',
                              fontWeight: 600,
                              color:
                                entry.flow === 'income'
                                  ? 'success.dark'
                                  : 'error.main',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {formatSignedAmount(
                              entry.value,
                              entry.flow,
                              entry.currency
                            )}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
}

// Centavos → a plain reais decimal string for the income input (150000 → "1500.00").
function toReaisInput(centavos: number): string {
  if (centavos <= 0) return '';
  return (centavos / 100).toFixed(2);
}

// A reais decimal string → centavos. Blank or non-numeric input reads as 0.
function parseReaisToCentavos(value: string): number {
  const trimmed = value.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return 0;
  return Math.round(Number(trimmed) * 100);
}

function toMonthLabel({ year, month }: Entry.MonthOption): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function formatSignedAmount(
  centavos: number,
  flow: Entry.Flow,
  currency: string
): string {
  const amount = (flow === 'income' ? centavos : -centavos) / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    signDisplay: 'always',
  }).format(amount);
}

// A running balance: plain currency, with a minus only when actually negative.
function formatBalance(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
}

// 'credit_card' → 'Credit Card', mirroring the statement table's type labels.
function toTypeLabel(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
