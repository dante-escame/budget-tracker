'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import FileUploadRoundedIcon from '@mui/icons-material/FileUploadRounded';

import type { Entry } from '@/lib/entries';
import { ImportStatementDialog } from '@/components/statement/ImportStatementDialog';

type SortKey = 'occurredAt' | 'shortDescription' | 'category' | 'type' | 'value';
type SortDirection = 'asc' | 'desc';

interface Column {
  key: SortKey;
  label: string;
  numeric: boolean;
}

const COLUMNS: Column[] = [
  { key: 'occurredAt', label: 'Date', numeric: false },
  { key: 'shortDescription', label: 'Description', numeric: false },
  { key: 'category', label: 'Category', numeric: false },
  { key: 'type', label: 'Type', numeric: false },
  { key: 'value', label: 'Amount', numeric: true },
];

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export function StatementView({
  months,
  selectedMonth,
  entries,
}: {
  months: Entry.MonthOption[];
  selectedMonth: Entry.MonthOption;
  entries: Entry.Record[];
}) {
  const router = useRouter();
  const [importOpen, setImportOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('occurredAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const monthOptions = useMemo(
    () => buildMonthOptions(months, selectedMonth),
    [months, selectedMonth]
  );
  const selectedValue = toMonthValue(selectedMonth);

  const sortedEntries = useMemo(
    () => sortEntries(entries, sortKey, sortDirection),
    [entries, sortKey, sortDirection]
  );

  const pagedEntries = useMemo(
    () => sortedEntries.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [sortedEntries, page, rowsPerPage]
  );

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(key === 'occurredAt' || key === 'value' ? 'desc' : 'asc');
    }
    setPage(0);
  }

  function handleMonthChange(value: string) {
    setPage(0);
    router.push(`/dashboard/statement?month=${value}`);
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', sm: 'center' },
          }}
        >
          <Stack spacing={0.5}>
            <Typography variant="overline" color="primary.dark">
              Transactions
            </Typography>
            <Typography variant="h4" component="h1" color="text.primary">
              Statement
            </Typography>
          </Stack>

          <Stack
            direction="row"
            spacing={1.5}
            sx={{
              alignItems: 'center',
              justifyContent: { xs: 'space-between', sm: 'flex-end' },
            }}
          >
            <TextField
              select
              size="small"
              label="Month"
              value={selectedValue}
              onChange={(event) => handleMonthChange(event.target.value)}
              sx={{ minWidth: 180 }}
            >
              {monthOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>

            <Button
              variant="contained"
              startIcon={<FileUploadRoundedIcon />}
              onClick={() => setImportOpen(true)}
            >
              Import
            </Button>
          </Stack>
        </Stack>

        <SummaryBar entries={entries} />

        <Paper variant="outlined" sx={{ borderColor: 'divider', overflow: 'hidden' }}>
          <TableContainer>
            <Table size="medium" aria-label="Bank statement entries">
              <TableHead>
                <TableRow sx={{ bgcolor: 'secondary.light' }}>
                  {COLUMNS.map((column) => (
                    <TableCell
                      key={column.key}
                      align={column.numeric ? 'right' : 'left'}
                      sortDirection={sortKey === column.key ? sortDirection : false}
                      sx={{ fontWeight: 600, color: 'text.primary' }}
                    >
                      <TableSortLabel
                        active={sortKey === column.key}
                        direction={sortKey === column.key ? sortDirection : 'asc'}
                        onClick={() => handleSort(column.key)}
                      >
                        {column.label}
                      </TableSortLabel>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {pagedEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={COLUMNS.length} sx={{ border: 0 }}>
                      <Box sx={{ py: 6, textAlign: 'center' }}>
                        <Typography color="text.secondary">
                          No entries for this month yet. Import a bank statement to get
                          started.
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedEntries.map((entry) => (
                    <EntryRow key={entry.id} entry={entry} />
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={sortedEntries.length}
            page={page}
            onPageChange={(_, nextPage) => setPage(nextPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(Number(event.target.value));
              setPage(0);
            }}
            rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
          />
        </Paper>
      </Stack>

      <ImportStatementDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => router.refresh()}
      />
    </Container>
  );
}

function EntryRow({ entry }: { entry: Entry.Record }) {
  const isIncome = entry.flow === 'income';

  return (
    <TableRow hover>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(entry.occurredAt)}</TableCell>
      <TableCell>
        <Typography variant="body2" color="text.primary">
          {entry.shortDescription}
        </Typography>
        {entry.merchant && (
          <Typography variant="caption" color="text.secondary">
            {entry.merchant}
          </Typography>
        )}
      </TableCell>
      <TableCell>
        <Chip
          label={toLabel(entry.category)}
          size="small"
          sx={{ bgcolor: 'secondary.light', color: 'secondary.contrastText' }}
        />
      </TableCell>
      <TableCell>
        <Typography variant="body2" color="text.secondary">
          {toLabel(entry.type)}
        </Typography>
      </TableCell>
      <TableCell align="right">
        <Typography
          component="span"
          sx={{
            fontFamily: 'var(--font-roboto-mono), "Roboto Mono", monospace',
            fontWeight: 600,
            color: isIncome ? 'success.dark' : 'error.main',
            whiteSpace: 'nowrap',
          }}
        >
          {formatSignedAmount(entry.value, entry.flow, entry.currency)}
        </Typography>
      </TableCell>
    </TableRow>
  );
}

function SummaryBar({ entries }: { entries: Entry.Record[] }) {
  const { income, outcome } = useMemo(() => {
    let income = 0;
    let outcome = 0;
    for (const entry of entries) {
      if (entry.flow === 'income') income += entry.value;
      else outcome += entry.value;
    }
    return { income, outcome };
  }, [entries]);

  const net = income - outcome;

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <SummaryCard label="Income" amount={income} tone="success.dark" />
      <SummaryCard label="Expenses" amount={outcome} tone="error.main" />
      <SummaryCard
        label="Net"
        amount={net}
        tone={net >= 0 ? 'success.dark' : 'error.main'}
      />
    </Stack>
  );
}

function SummaryCard({
  label,
  amount,
  tone,
}: {
  label: string;
  amount: number;
  tone: string;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{ flex: 1, p: 2, borderColor: 'divider', bgcolor: 'background.paper' }}
    >
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography
        sx={{
          fontFamily: 'var(--font-roboto-mono), "Roboto Mono", monospace',
          fontWeight: 700,
          fontSize: 20,
          color: tone,
        }}
      >
        {formatCurrency(amount / 100, 'BRL')}
      </Typography>
    </Paper>
  );
}

function sortEntries(
  entries: Entry.Record[],
  key: SortKey,
  direction: SortDirection
): Entry.Record[] {
  const factor = direction === 'asc' ? 1 : -1;
  return [...entries].sort((a, b) => {
    let comparison: number;
    if (key === 'value') {
      // Compare by signed amount so income and expenses order intuitively.
      comparison = signedValue(a) - signedValue(b);
    } else if (key === 'occurredAt') {
      comparison = a.occurredAt.localeCompare(b.occurredAt);
    } else {
      comparison = String(a[key]).localeCompare(String(b[key]));
    }
    return comparison * factor;
  });
}

function signedValue(entry: Entry.Record): number {
  return entry.flow === 'income' ? entry.value : -entry.value;
}

function buildMonthOptions(
  months: Entry.MonthOption[],
  selected: Entry.MonthOption
): { value: string; label: string }[] {
  const present = months.some(
    (m) => m.year === selected.year && m.month === selected.month
  );
  const all = present ? months : [selected, ...months];
  return all.map((option) => ({
    value: toMonthValue(option),
    label: toMonthLabel(option),
  }));
}

function toMonthValue({ year, month }: Entry.MonthOption): string {
  return `${year}-${String(month).padStart(2, '0')}`;
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
  return formatCurrency(amount, currency);
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    signDisplay: 'always',
  }).format(amount);
}

function toLabel(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
