'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
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
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import PlaylistAddRoundedIcon from '@mui/icons-material/PlaylistAddRounded';
import type { Investment } from '@/lib/investments';
import {
  CATEGORY_LABELS,
  RISK_COLOR,
  RISK_LABELS,
} from '@/components/investments/constants';
import { InvestmentChartSlider } from '@/components/investments/InvestmentChartSlider';
import {
  formatCurrency,
  formatDate,
  formatPercent,
} from '@/components/investments/format';
import { InvestmentFormDialog } from '@/components/investments/InvestmentFormDialog';
import { ApplicationFormDialog } from '@/components/investments/ApplicationFormDialog';
import { AssignEntryDialog } from '@/components/investments/AssignEntryDialog';

const HISTORY_ROWS_PER_PAGE = [10, 25, 50];

export function InvestmentsView({
  positions,
  applications,
}: {
  positions: Investment.PositionRecord[];
  applications: Investment.ApplicationRecord[];
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<Investment.PositionRecord | undefined>();
  const [appOpen, setAppOpen] = useState(false);
  const [appKey, setAppKey] = useState(0);
  const [appTarget, setAppTarget] = useState<Investment.PositionRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Investment.PositionRecord | null>(
    null
  );
  const [historyAppOpen, setHistoryAppOpen] = useState(false);
  const [historyAppKey, setHistoryAppKey] = useState(0);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignKey, setAssignKey] = useState(0);
  const [assignTarget, setAssignTarget] = useState<Investment.ApplicationRecord | null>(null);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const walletTotal = useMemo(
    () => positions.reduce((sum, position) => sum + position.currentValue, 0),
    [positions]
  );

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(applications.length / rowsPerPage) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [applications.length, rowsPerPage, page]);

  const pagedApplications = useMemo(
    () => applications.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [applications, page, rowsPerPage]
  );

  function openCreate() {
    setEditing(undefined);
    setFormKey((key) => key + 1);
    setFormOpen(true);
  }

  function openEdit(position: Investment.PositionRecord) {
    setEditing(position);
    setFormKey((key) => key + 1);
    setFormOpen(true);
  }

  function openApplication(position: Investment.PositionRecord) {
    setAppTarget(position);
    setAppKey((key) => key + 1);
    setAppOpen(true);
  }

  function openAssign(application: Investment.ApplicationRecord) {
    setAssignTarget(application);
    setAssignKey((key) => key + 1);
    setAssignOpen(true);
  }

  async function handleDeletePosition() {
    if (!deleteTarget) return;
    setPending(true);
    try {
      const response = await fetch(`/api/investments/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setToast(data?.error ?? 'Could not delete investment.');
        return;
      }
      setToast('Investment deleted.');
      setDeleteTarget(null);
      router.refresh();
    } catch {
      setToast('Network error. Please try again.');
    } finally {
      setPending(false);
    }
  }

  async function handleDeleteApplication(application: Investment.ApplicationRecord) {
    if (!application.investmentId) return;
    try {
      const response = await fetch(
        `/api/investments/${application.investmentId}/applications/${application.id}`,
        { method: 'DELETE' }
      );
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setToast(data?.error ?? 'Could not delete application.');
        return;
      }
      setToast('Application deleted.');
      router.refresh();
    } catch {
      setToast('Network error. Please try again.');
    }
  }

  async function handleDeleteStatementEntry(application: Investment.ApplicationRecord) {
    try {
      const response = await fetch(`/api/entries/${application.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setToast(data?.error ?? 'Could not delete entry.');
        return;
      }
      setToast('Entry deleted.');
      router.refresh();
    } catch {
      setToast('Network error. Please try again.');
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
              Portfolio
            </Typography>
            <Typography variant="h4" component="h1" color="text.primary">
              Investments
            </Typography>
          </Stack>

          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={openCreate}
          >
            Add investment
          </Button>
        </Stack>

        <Paper variant="outlined" sx={{ borderColor: 'divider', p: { xs: 2, md: 3 } }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Distribution
          </Typography>

          {positions.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No investments yet. Add one to start tracking your portfolio.
              </Typography>
            </Box>
          ) : (
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
              <InvestmentChartSlider positions={positions} />

              <TableContainer sx={{ flex: 1 }}>
                <Table size="small" aria-label="Investment positions">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'secondary.light' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        Value
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Last Application</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        %
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        Total Applied
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Risk</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {positions.map((position) => (
                      <TableRow key={position.id} hover>
                        <TableCell>{position.name}</TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          {formatCurrency(position.currentValue, position.currency)}
                        </TableCell>
                        <TableCell>{CATEGORY_LABELS[position.category]}</TableCell>
                        <TableCell>{position.type}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {formatDate(position.lastApplicationAt)}
                        </TableCell>
                        <TableCell align="right">
                          {formatPercent(position.sharePct)}
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          {formatCurrency(position.totalApplied, position.currency)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={RISK_LABELS[position.risk]}
                            color={RISK_COLOR[position.risk]}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          <Tooltip title="Add application">
                            <IconButton
                              size="small"
                              onClick={() => openApplication(position)}
                            >
                              <PlaylistAddRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => openEdit(position)}>
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={() => setDeleteTarget(position)}
                            >
                              <DeleteOutlineRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          )}

          {positions.length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              Wallet total: {formatCurrency(walletTotal, 'BRL')}
            </Typography>
          )}
        </Paper>

        <Paper variant="outlined" sx={{ borderColor: 'divider', overflow: 'hidden' }}>
          <Stack
            direction="row"
            sx={{ px: { xs: 2, md: 3 }, pt: { xs: 2, md: 3 }, pb: 1, justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Typography variant="h6">History</Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddRoundedIcon />}
              onClick={() => {
                setHistoryAppKey((k) => k + 1);
                setHistoryAppOpen(true);
              }}
              disabled={positions.length === 0}
            >
              Add
            </Button>
          </Stack>
          <TableContainer>
            <Table size="small" aria-label="Application history">
              <TableHead>
                <TableRow sx={{ bgcolor: 'secondary.light' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Investment</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Amount
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pagedApplications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ border: 0 }}>
                      <Box sx={{ py: 5, textAlign: 'center' }}>
                        <Typography color="text.secondary">
                          No applications yet.
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedApplications.map((application) => (
                    <TableRow key={application.id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {formatDate(application.appliedAt)}
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>
                        {application.entryDescription ?? '—'}
                      </TableCell>
                      <TableCell>
                        {application.source === 'statement_entry' ? (
                          <Chip size="small" label="Unassigned" variant="outlined" color="warning" />
                        ) : (
                          application.investmentName
                        )}
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <Chip
                          size="small"
                          label={application.flow === 'income' ? 'Income' : 'Outcome'}
                          color={application.flow === 'income' ? 'success' : 'default'}
                          sx={{ mr: 1 }}
                        />
                        {formatCurrency(application.value, 'BRL')}
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        {application.source === 'statement_entry' ? (
                          <>
                            <Tooltip title="Assign to investment">
                              <IconButton
                                size="small"
                                onClick={() => openAssign(application)}
                              >
                                <LinkRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete entry">
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteStatementEntry(application)}
                              >
                                <DeleteOutlineRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        ) : (
                          <Tooltip title="Delete application">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteApplication(application)}
                            >
                              <DeleteOutlineRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={applications.length}
            page={page}
            onPageChange={(_, nextPage) => setPage(nextPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(Number(event.target.value));
              setPage(0);
            }}
            rowsPerPageOptions={HISTORY_ROWS_PER_PAGE}
          />
        </Paper>
      </Stack>

      <InvestmentFormDialog
        key={`form-${formKey}`}
        open={formOpen}
        investment={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setToast(editing ? 'Investment updated.' : 'Investment added.');
          router.refresh();
        }}
      />

      <ApplicationFormDialog
        key={`app-${appKey}`}
        open={appOpen}
        investment={appTarget}
        onClose={() => setAppOpen(false)}
        onSaved={() => {
          setToast('Application added.');
          router.refresh();
        }}
      />

      <ApplicationFormDialog
        key={`history-app-${historyAppKey}`}
        open={historyAppOpen}
        investment={null}
        positions={positions}
        onClose={() => setHistoryAppOpen(false)}
        onSaved={() => {
          setToast('Application added.');
          router.refresh();
        }}
      />

      <AssignEntryDialog
        key={`assign-${assignKey}`}
        open={assignOpen}
        entryId={assignTarget?.id ?? ''}
        entryDescription={assignTarget?.entryDescription ?? assignTarget?.investmentName ?? ''}
        positions={positions}
        onClose={() => setAssignOpen(false)}
        onSaved={() => {
          setToast('Entry assigned to investment.');
          router.refresh();
        }}
      />

      <Dialog open={deleteTarget !== null} onClose={() => !pending && setDeleteTarget(null)}>
        <DialogTitle>Delete investment?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete <strong>{deleteTarget?.name}</strong>? Its applications and their
            linked statement entries are removed too. This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={pending}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={handleDeletePosition} disabled={pending}>
            Delete
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
