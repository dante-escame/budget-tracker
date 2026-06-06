'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
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
import Typography from '@mui/material/Typography';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import FileUploadRoundedIcon from '@mui/icons-material/FileUploadRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';

import { CATEGORY_LABELS } from '@/lib/entries/categories';
import type { Entry } from '@/lib/entries';
import type { CreditCard } from '@/lib/credit-cards';
import { parseInstallment } from '@/lib/credit-cards/transform';
import { ImportCreditCardDialog } from '@/components/credit-cards/ImportCreditCardDialog';

type SortKey = 'occurredAt' | 'shortDescription' | 'category' | 'value';
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
  { key: 'value', label: 'Amount', numeric: true },
];

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export function CreditCardsView({
  bills,
  selectedCard,
  selectedMonth,
  bill,
  entries,
}: {
  bills: CreditCard.BillSummary[];
  selectedCard: string | null;
  selectedMonth: CreditCard.MonthOption | null;
  bill: CreditCard.BillRecord | null;
  entries: Entry.Record[];
}) {
  const router = useRouter();
  const [importOpen, setImportOpen] = useState(false);
  const [detailEntry, setDetailEntry] = useState<Entry.Record | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('occurredAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const cards = useMemo(() => uniqueCards(bills), [bills]);
  const monthsForCard = useMemo(
    () => bills.filter((b) => b.cardLabel === selectedCard).map((b) => b.competence),
    [bills, selectedCard]
  );

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

  function handleCardChange(card: string) {
    setPage(0);
    router.push(`/dashboard/credit-cards?card=${encodeURIComponent(card)}`);
  }

  function handleMonthChange(value: string) {
    setPage(0);
    const card = selectedCard ?? '';
    router.push(
      `/dashboard/credit-cards?card=${encodeURIComponent(card)}&month=${value}`
    );
  }

  const hasBills = bills.length > 0;

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
              Credit cards
            </Typography>
            <Typography variant="h4" component="h1" color="text.primary">
              Bills
            </Typography>
          </Stack>

          <Stack
            direction="row"
            spacing={1.5}
            sx={{ alignItems: 'center', justifyContent: { xs: 'space-between', sm: 'flex-end' } }}
          >
            {hasBills && selectedCard && (
              <>
                <TextField
                  select
                  size="small"
                  label="Card"
                  value={selectedCard}
                  onChange={(event) => handleCardChange(event.target.value)}
                  sx={{ minWidth: 160 }}
                >
                  {cards.map((card) => (
                    <MenuItem key={card} value={card}>
                      {card}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  size="small"
                  label="Bill month"
                  value={selectedMonth ? toMonthValue(selectedMonth) : ''}
                  onChange={(event) => handleMonthChange(event.target.value)}
                  sx={{ minWidth: 180 }}
                >
                  {monthsForCard.map((option) => (
                    <MenuItem key={toMonthValue(option)} value={toMonthValue(option)}>
                      {toMonthLabel(option)}
                    </MenuItem>
                  ))}
                </TextField>
              </>
            )}

            <Button
              variant="contained"
              startIcon={<FileUploadRoundedIcon />}
              onClick={() => setImportOpen(true)}
            >
              Import
            </Button>
          </Stack>
        </Stack>

        {!hasBills && (
          <Paper variant="outlined" sx={{ borderColor: 'divider', p: 6, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No credit-card bills yet. Import a fatura CSV to get started.
            </Typography>
          </Paper>
        )}

        {hasBills && bill && (
          <>
            <BillHeader bill={bill} onLink={() => setLinkOpen(true)} />

            <Paper variant="outlined" sx={{ borderColor: 'divider', overflow: 'hidden' }}>
              <TableContainer>
                <Table size="medium" aria-label="Credit-card bill line items">
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
                              This bill has no line items.
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      pagedEntries.map((entry) => (
                        <LineItemRow
                          key={entry.id}
                          entry={entry}
                          onClick={() => setDetailEntry(entry)}
                        />
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
          </>
        )}
      </Stack>

      <ImportCreditCardDialog
        open={importOpen}
        defaultCardLabel={selectedCard}
        onClose={() => setImportOpen(false)}
        onImported={() => router.refresh()}
      />

      <LineItemDetailDialog entry={detailEntry} onClose={() => setDetailEntry(null)} />

      {bill && (
        <LinkPaymentDialog
          open={linkOpen}
          bill={bill}
          onClose={() => setLinkOpen(false)}
          onLinked={(message) => {
            setLinkOpen(false);
            setToast(message);
            router.refresh();
          }}
        />
      )}

      <Snackbar
        open={toast !== null}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setToast(null)} sx={{ width: '100%' }}>
          {toast}
        </Alert>
      </Snackbar>
    </Container>
  );
}

function BillHeader({
  bill,
  onLink,
}: {
  bill: CreditCard.BillRecord;
  onLink: () => void;
}) {
  const paid = bill.paidAt !== null;
  const paymentMonth = bill.linkedPayment
    ? monthValueFromIso(bill.linkedPayment.occurredAt)
    : null;

  return (
    <Paper variant="outlined" sx={{ borderColor: 'divider', p: 2.5 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}
      >
        <Stack spacing={0.5}>
          <Typography variant="caption" color="text.secondary">
            Total (excludes payment received)
          </Typography>
          <Typography
            sx={{
              fontFamily: 'var(--font-roboto-mono), "Roboto Mono", monospace',
              fontWeight: 700,
              fontSize: 24,
              color: 'text.primary',
            }}
          >
            {formatCurrency(bill.total / 100, bill.currency)}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          {paid ? (
            <Chip
              icon={<CheckCircleRoundedIcon />}
              label="Paid"
              color="success"
              sx={{ fontWeight: 600 }}
            />
          ) : (
            <Chip label="Unpaid" variant="outlined" color="default" />
          )}

          {bill.linkedPayment && paymentMonth && (
            <Button
              component={Link}
              href={`/dashboard/statement?month=${paymentMonth}&entry=${bill.linkedPayment.entryId}`}
              size="small"
              variant="text"
              startIcon={<OpenInNewRoundedIcon />}
            >
              Origin
            </Button>
          )}

          <Button size="small" variant="outlined" startIcon={<LinkRoundedIcon />} onClick={onLink}>
            {paid ? 'Change payment' : 'Link payment'}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

function LineItemRow({
  entry,
  onClick,
}: {
  entry: Entry.Record;
  onClick: () => void;
}) {
  const isIncome = entry.flow === 'income';

  return (
    <TableRow hover sx={{ cursor: 'pointer' }} onClick={onClick}>
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
          label={CATEGORY_LABELS[entry.category]}
          size="small"
          sx={{ bgcolor: 'secondary.light', color: 'secondary.contrastText' }}
        />
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

function LineItemDetailDialog({
  entry,
  onClose,
}: {
  entry: Entry.Record | null;
  onClose: () => void;
}) {
  const installment = entry ? parseInstallment(entry.description) : null;

  return (
    <Dialog open={entry !== null} onClose={onClose} fullWidth maxWidth="sm">
      {entry && (
        <>
          <DialogTitle>Line item</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={1.5} divider={<Divider flexItem />}>
              <DetailRow label="Description" value={entry.description} />
              {entry.merchant && <DetailRow label="Merchant" value={entry.merchant} />}
              <DetailRow label="Date" value={formatDate(entry.occurredAt)} />
              <DetailRow label="Category" value={CATEGORY_LABELS[entry.category]} />
              {installment && (
                <DetailRow
                  label="Installment"
                  value={`${installment.number} of ${installment.total}`}
                />
              )}
              <DetailRow
                label="Amount"
                value={formatSignedAmount(entry.value, entry.flow, entry.currency)}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} color="inherit">
              Close
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" color="text.primary" sx={{ textAlign: 'right' }}>
        {value}
      </Typography>
    </Stack>
  );
}

function LinkPaymentDialog({
  open,
  bill,
  onClose,
  onLinked,
}: {
  open: boolean;
  bill: CreditCard.BillRecord;
  onClose: () => void;
  onLinked: (message: string) => void;
}) {
  const [candidates, setCandidates] = useState<CreditCard.PaymentCandidate[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lazily fetch candidates the first time the dialog opens.
  useEffect(() => {
    if (open && candidates === null) void loadCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function loadCandidates() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/credit-cards/bills/${bill.id}/payment-candidates`
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error ?? 'Could not load payment candidates.');
        return;
      }
      const list = (payload?.candidates ?? []) as CreditCard.PaymentCandidate[];
      setCandidates(list);
      setSelected(bill.linkedPayment?.entryId ?? list[0]?.entryId ?? null);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function submit(paymentEntryId: string | null) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/credit-cards/bills/${bill.id}/link-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentEntryId }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error ?? 'Could not update the payment link.');
        return;
      }
      onLinked(paymentEntryId ? 'Payment linked — bill marked as paid.' : 'Payment unlinked.');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => !pending && onClose()}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>Link bank-statement payment</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Choose the statement “pagamento de fatura” that settled this bill. The best
            match is pre-selected; confirm to mark the bill as paid.
          </Typography>

          {loading && <Typography variant="body2">Loading candidates…</Typography>}

          {!loading && candidates && candidates.length === 0 && (
            <Alert severity="info">
              No matching statement payment was found near this bill’s month. Import the
              relevant bank statement first.
            </Alert>
          )}

          {!loading && candidates && candidates.length > 0 && (
            <RadioGroup
              value={selected ?? ''}
              onChange={(event) => setSelected(event.target.value)}
            >
              {candidates.map((candidate) => (
                <FormControlLabel
                  key={candidate.entryId}
                  value={candidate.entryId}
                  control={<Radio />}
                  label={
                    <Stack>
                      <Typography variant="body2">
                        {formatDate(candidate.occurredAt)} —{' '}
                        {formatCurrency(candidate.value / 100, bill.currency)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {candidate.description}
                      </Typography>
                    </Stack>
                  }
                />
              ))}
            </RadioGroup>
          )}

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {bill.linkedPayment && (
          <Button onClick={() => void submit(null)} disabled={pending} color="inherit">
            Unlink
          </Button>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={onClose} disabled={pending} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => selected && void submit(selected)}
          disabled={pending || !selected}
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function uniqueCards(bills: CreditCard.BillSummary[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const bill of bills) {
    if (!seen.has(bill.cardLabel)) {
      seen.add(bill.cardLabel);
      result.push(bill.cardLabel);
    }
  }
  return result;
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

function toMonthValue({ year, month }: CreditCard.MonthOption): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function toMonthLabel({ year, month }: CreditCard.MonthOption): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function monthValueFromIso(iso: string): string {
  return iso.slice(0, 7);
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

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(amount);
}
