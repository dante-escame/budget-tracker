'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
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
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import FileUploadRoundedIcon from '@mui/icons-material/FileUploadRounded';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import PushPinRoundedIcon from '@mui/icons-material/PushPinRounded';
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';

import { ALL_CATEGORIES, CATEGORY_LABELS } from '@/lib/entries/categories';
import type { Entry } from '@/lib/entries';
import type { BaseData } from '@/lib/base-data';
import { ImportStatementDialog } from '@/components/statement/ImportStatementDialog';
import { BaseDataDialog } from '@/components/statement/BaseDataDialog';

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

// A statement entry decorated with whether it matches a marked fixed expense.
export type StatementEntry = Entry.Record & { isFixed: boolean };

export function StatementView({
  months,
  selectedMonth,
  entries,
  highlightEntryId = null,
  baseData = null,
  startingBalance = null,
  endingBalance = null,
}: {
  months: Entry.MonthOption[];
  selectedMonth: Entry.MonthOption;
  entries: StatementEntry[];
  highlightEntryId?: string | null;
  baseData?: BaseData.Record | null;
  startingBalance?: number | null;
  endingBalance?: number | null;
}) {
  const router = useRouter();
  // Local copy of the server entries so an inline edit reflects immediately
  // without a full reload. Re-synced during render whenever the prop changes
  // (e.g. month switch) — the documented React pattern, avoiding a sync effect.
  const [rows, setRows] = useState<StatementEntry[]>(entries);
  const [syncedEntries, setSyncedEntries] = useState(entries);
  if (syncedEntries !== entries) {
    setSyncedEntries(entries);
    setRows(entries);
  }

  const [fixedPendingId, setFixedPendingId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [baseDataOpen, setBaseDataOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyPending, setApplyPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('occurredAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [search, setSearch] = useState('');
  // Start on the page holding the linked entry when arriving via an "origin" link.
  const [page, setPage] = useState(() =>
    initialPage(entries, highlightEntryId, rowsPerPage)
  );

  const monthOptions = useMemo(
    () => buildMonthOptions(months, selectedMonth),
    [months, selectedMonth]
  );
  const selectedValue = toMonthValue(selectedMonth);

  const sortedEntries = useMemo(
    () => sortEntries(rows, sortKey, sortDirection),
    [rows, sortKey, sortDirection]
  );

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedEntries;
    return sortedEntries.filter(
      (entry) =>
        entry.description.toLowerCase().includes(q) ||
        entry.shortDescription.toLowerCase().includes(q) ||
        (entry.merchant?.toLowerCase().includes(q) ?? false)
    );
  }, [sortedEntries, search]);

  const pagedEntries = useMemo(
    () => filteredEntries.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredEntries, page, rowsPerPage]
  );

  const highlightRowRef = useRef<HTMLTableRowElement>(null);

  // Scroll the highlighted row into view once it is on the visible page.
  useEffect(() => {
    if (highlightEntryId && highlightRowRef.current) {
      highlightRowRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [highlightEntryId, pagedEntries]);

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

  function handleRowSaved(updated: Entry.Record) {
    setRows((prev) =>
      prev.map((row) =>
        row.id === updated.id ? { ...updated, isFixed: row.isFixed } : row
      )
    );
    setToast('Transaction updated.');
  }

  async function handleToggleFixed(entry: StatementEntry) {
    setFixedPendingId(entry.id);
    try {
      const response = await fetch('/api/fixed-expenses', {
        method: entry.isFixed ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: entry.id }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setToast(data?.error ?? 'Could not update fixed expense.');
        return;
      }

      setToast(
        entry.isFixed
          ? 'Removed from fixed expenses.'
          : 'Marked as fixed expense. Future imports will be flagged automatically.'
      );
      router.refresh();
    } catch {
      setToast('Network error. Please try again.');
    } finally {
      setFixedPendingId(null);
    }
  }

  async function handleApplyRules() {
    setApplyPending(true);
    try {
      const response = await fetch('/api/entries/apply-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: selectedValue }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setToast(data?.error ?? 'Could not apply rules.');
        return;
      }

      const summary: Entry.ApplyRulesSummary = await response.json();
      setApplyOpen(false);
      setToast(
        `Applied rules: ${summary.updated} of ${summary.total} transactions updated.`
      );
      router.refresh();
    } catch {
      setToast('Network error. Please try again.');
    } finally {
      setApplyPending(false);
    }
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
              variant="outlined"
              startIcon={<SavingsRoundedIcon />}
              onClick={() => setBaseDataOpen(true)}
            >
              Base data
            </Button>

            <Button
              variant="outlined"
              startIcon={<AutoFixHighRoundedIcon />}
              onClick={() => setApplyOpen(true)}
              disabled={entries.length === 0}
            >
              Apply All Rules
            </Button>

            <Button
              variant="contained"
              startIcon={<FileUploadRoundedIcon />}
              onClick={() => setImportOpen(true)}
            >
              Import
            </Button>
          </Stack>
        </Stack>

        <SummaryBar
          entries={rows}
          startingBalance={startingBalance}
          endingBalance={endingBalance}
        />

        <Paper variant="outlined" sx={{ borderColor: 'divider', overflow: 'hidden' }}>
          <Box sx={{ px: { xs: 2, md: 3 }, pt: 2, pb: 1 }}>
            <TextField
              size="small"
              placeholder="Search description or merchant…"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
              fullWidth
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: search ? (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        aria-label="Clear search"
                        onClick={() => { setSearch(''); setPage(0); }}
                        edge="end"
                      >
                        <CloseRoundedIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                },
              }}
            />
          </Box>
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
                  <TableCell align="center" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    Fixed
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pagedEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={COLUMNS.length + 2} sx={{ border: 0 }}>
                      <Box sx={{ py: 6, textAlign: 'center' }}>
                        <Typography color="text.secondary">
                          {search.trim()
                            ? 'No entries match your search.'
                            : 'No entries for this month yet. Import a bank statement to get started.'}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedEntries.map((entry) => {
                    const highlighted = entry.id === highlightEntryId;
                    return (
                      <EntryRow
                        key={entry.id}
                        entry={entry}
                        highlighted={highlighted}
                        rowRef={highlighted ? highlightRowRef : undefined}
                        onSaved={handleRowSaved}
                        onError={setToast}
                        fixedPending={fixedPendingId === entry.id}
                        onToggleFixed={() => handleToggleFixed(entry)}
                      />
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={filteredEntries.length}
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

      <BaseDataDialog
        open={baseDataOpen}
        baseData={baseData}
        onClose={() => setBaseDataOpen(false)}
        onSaved={() => {
          setBaseDataOpen(false);
          setToast('Base data saved.');
          router.refresh();
        }}
      />

      <Dialog open={applyOpen} onClose={() => !applyPending && setApplyOpen(false)}>
        <DialogTitle>Apply tagging rules?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Apply your tagging rules to {toMonthLabel(selectedMonth)}? This
            overwrites the category of every transaction that matches a rule.
            Transactions matching no rule are left unchanged.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setApplyOpen(false)} disabled={applyPending}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleApplyRules}
            disabled={applyPending}
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast !== null}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="info"
          variant="filled"
          onClose={() => setToast(null)}
          sx={{ width: '100%' }}
        >
          {toast}
        </Alert>
      </Snackbar>
    </Container>
  );
}

function EntryRow({
  entry,
  highlighted = false,
  rowRef,
  onSaved,
  onError,
  fixedPending,
  onToggleFixed,
}: {
  entry: StatementEntry;
  highlighted?: boolean;
  rowRef?: React.Ref<HTMLTableRowElement>;
  onSaved: (updated: Entry.Record) => void;
  onError: (message: string) => void;
  fixedPending: boolean;
  onToggleFixed: () => void;
}) {
  const isIncome = entry.flow === 'income';
  const isCard = entry.source === 'credit_card_bill';

  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [description, setDescription] = useState(entry.description);
  const [category, setCategory] = useState<Entry.Category>(entry.category);

  function startEdit() {
    setDescription(entry.description);
    setCategory(entry.category);
    setEditing(true);
  }

  function cancelEdit() {
    if (pending) return;
    setEditing(false);
  }

  async function handleSave() {
    const trimmed = description.trim();
    if (trimmed.length === 0) {
      onError('Description is required.');
      return;
    }

    const body: { description?: string; category?: Entry.Category } = {};
    if (trimmed !== entry.description) body.description = trimmed;
    if (category !== entry.category) body.category = category;

    // Nothing changed — just leave edit mode without a round trip.
    if (body.description === undefined && body.category === undefined) {
      setEditing(false);
      return;
    }

    setPending(true);
    try {
      const response = await fetch(`/api/entries/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        onError(data?.error ?? 'Could not update the transaction.');
        return;
      }

      const updated: Entry.Record = await response.json();
      setEditing(false);
      onSaved(updated);
    } catch {
      onError('Network error. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <TableRow
      hover
      ref={rowRef}
      sx={highlighted ? { bgcolor: 'primary.light' } : undefined}
    >
      <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(entry.occurredAt)}</TableCell>
      <TableCell>
        {editing ? (
          <TextField
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            size="small"
            fullWidth
            multiline
            maxRows={3}
            autoFocus
            disabled={pending}
            aria-label="Description"
          />
        ) : (
          <>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="body2" color="text.primary">
                {entry.shortDescription}
              </Typography>
              {isCard && (
                <Chip
                  label="Card"
                  size="small"
                  variant="outlined"
                  sx={{ height: 18, fontSize: 10 }}
                />
              )}
            </Stack>
            {entry.merchant && (
              <Typography variant="caption" color="text.secondary">
                {entry.merchant}
              </Typography>
            )}
          </>
        )}
      </TableCell>
      <TableCell>
        {editing ? (
          <TextField
            select
            value={category}
            onChange={(event) => setCategory(event.target.value as Entry.Category)}
            size="small"
            disabled={pending}
            sx={{ minWidth: 160 }}
            aria-label="Category"
          >
            {ALL_CATEGORIES.map((option) => (
              <MenuItem key={option} value={option}>
                {CATEGORY_LABELS[option]}
              </MenuItem>
            ))}
          </TextField>
        ) : (
          <Chip
            label={CATEGORY_LABELS[entry.category]}
            size="small"
            sx={{ bgcolor: 'secondary.light', color: 'secondary.contrastText' }}
          />
        )}
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
      <TableCell align="center">
        <Tooltip
          title={entry.isFixed ? 'Unmark as fixed expense' : 'Mark as fixed expense'}
        >
          <span>
            <IconButton
              size="small"
              color={entry.isFixed ? 'primary' : 'default'}
              onClick={onToggleFixed}
              disabled={fixedPending}
              aria-label={
                entry.isFixed ? 'Unmark as fixed expense' : 'Mark as fixed expense'
              }
            >
              {entry.isFixed ? (
                <PushPinRoundedIcon fontSize="small" />
              ) : (
                <PushPinOutlinedIcon fontSize="small" />
              )}
            </IconButton>
          </span>
        </Tooltip>
      </TableCell>
      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
        {editing ? (
          <>
            <IconButton
              size="small"
              color="primary"
              aria-label="Save changes"
              onClick={handleSave}
              disabled={pending}
            >
              {pending ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <CheckRoundedIcon fontSize="small" />
              )}
            </IconButton>
            <IconButton
              size="small"
              aria-label="Cancel editing"
              onClick={cancelEdit}
              disabled={pending}
            >
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </>
        ) : (
          <IconButton size="small" aria-label="Edit transaction" onClick={startEdit}>
            <EditRoundedIcon fontSize="small" />
          </IconButton>
        )}
      </TableCell>
    </TableRow>
  );
}

function SummaryBar({
  entries,
  startingBalance,
  endingBalance,
}: {
  entries: Entry.Record[];
  startingBalance: number | null;
  endingBalance: number | null;
}) {
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
  const hasBalance = startingBalance !== null && endingBalance !== null;

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <SummaryCard label="Income" amount={income} tone="success.dark" />
        <SummaryCard label="Expenses" amount={outcome} tone="error.main" />
        <SummaryCard
          label="Net"
          amount={net}
          tone={net >= 0 ? 'success.dark' : 'error.main'}
        />
      </Stack>
      {hasBalance && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <SummaryCard
            label="Starting balance"
            amount={startingBalance}
            tone={startingBalance >= 0 ? 'success.dark' : 'error.main'}
            signed={false}
          />
          <SummaryCard
            label="Ending balance"
            amount={endingBalance}
            tone={endingBalance >= 0 ? 'success.dark' : 'error.main'}
            signed={false}
          />
        </Stack>
      )}
    </Stack>
  );
}

function SummaryCard({
  label,
  amount,
  tone,
  signed = true,
}: {
  label: string;
  amount: number;
  tone: string;
  // Income/expense/net always show a +/- sign; balances read as plain totals.
  signed?: boolean;
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
        {signed
          ? formatCurrency(amount / 100, 'BRL')
          : formatBalance(amount / 100, 'BRL')}
      </Typography>
    </Paper>
  );
}

// The page index (0-based) that holds the highlighted entry under the default
// sort, so an "origin" link lands directly on it. Defaults to the first page.
function initialPage(
  entries: Entry.Record[],
  highlightEntryId: string | null,
  rowsPerPage: number
): number {
  if (!highlightEntryId) return 0;
  const ordered = sortEntries(entries, 'occurredAt', 'desc');
  const index = ordered.findIndex((e) => e.id === highlightEntryId);
  return index >= 0 ? Math.floor(index / rowsPerPage) : 0;
}

function sortEntries<T extends Entry.Record>(
  entries: T[],
  key: SortKey,
  direction: SortDirection
): T[] {
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

// A running balance: plain currency, with a minus only when actually negative.
function formatBalance(amount: number, currency: string): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(amount);
}

function toLabel(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
