'use client';

import { useState } from 'react';
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
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';

import {
  ALL_CATEGORIES,
  CATEGORY_LABELS,
} from '@/lib/entries/categories';
import type { Entry } from '@/lib/entries';

type FlowChoice = 'any' | 'income' | 'outcome';

interface FormState {
  pattern: string;
  category: Entry.Category;
  flow: FlowChoice;
  priority: string;
}

const EMPTY_FORM: FormState = {
  pattern: '',
  category: 'other_outcome',
  flow: 'any',
  priority: '',
};

const FLOW_LABELS: Record<FlowChoice, string> = {
  any: 'Any',
  income: 'Income',
  outcome: 'Outcome',
};

export function TaggingRulesView({ rules }: { rules: Entry.TaggingRuleRecord[] }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<Entry.TaggingRuleRecord | null>(null);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(rule: Entry.TaggingRuleRecord) {
    setEditingId(rule.id);
    setForm({
      pattern: rule.pattern,
      category: rule.category,
      flow: rule.flow ?? 'any',
      priority: String(rule.priority),
    });
    setError(null);
    setDialogOpen(true);
  }

  function closeDialog() {
    if (pending) return;
    setDialogOpen(false);
  }

  async function handleSubmit() {
    if (form.pattern.trim().length === 0) {
      setError('Pattern is required.');
      return;
    }

    setPending(true);
    setError(null);

    const body = {
      pattern: form.pattern.trim(),
      category: form.category,
      matchType: 'contains' as const,
      flow: form.flow === 'any' ? null : form.flow,
      ...(form.priority.trim() === ''
        ? {}
        : { priority: Number(form.priority) }),
    };

    const url = editingId
      ? `/api/tagging-rules/${editingId}`
      : '/api/tagging-rules';

    try {
      const response = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error ?? 'Could not save the rule.');
        return;
      }

      setDialogOpen(false);
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setPending(true);
    try {
      const response = await fetch(`/api/tagging-rules/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setDeleteTarget(null);
        router.refresh();
      }
    } finally {
      setPending(false);
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
              Automation
            </Typography>
            <Typography variant="h4" component="h1" color="text.primary">
              Tagging Rules
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Rules assign a category to transactions whose text contains the
              pattern. They run on import and via &ldquo;Apply All Rules&rdquo;.
            </Typography>
          </Stack>

          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={openCreate}
            sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}
          >
            Add rule
          </Button>
        </Stack>

        <Paper variant="outlined" sx={{ borderColor: 'divider', overflow: 'hidden' }}>
          <TableContainer>
            <Table size="medium" aria-label="Tagging rules">
              <TableHead>
                <TableRow sx={{ bgcolor: 'secondary.light' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Priority</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Pattern</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Flow</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ border: 0 }}>
                      <Box sx={{ py: 6, textAlign: 'center' }}>
                        <Typography color="text.secondary">
                          No rules yet. Add one to start auto-categorizing your
                          transactions.
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  rules.map((rule) => (
                    <TableRow key={rule.id} hover>
                      <TableCell>{rule.priority}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace' }}>
                        {rule.pattern}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={CATEGORY_LABELS[rule.category]}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {rule.flow ? FLOW_LABELS[rule.flow] : FLOW_LABELS.any}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          aria-label={`Edit rule ${rule.pattern}`}
                          onClick={() => openEdit(rule)}
                        >
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          aria-label={`Delete rule ${rule.pattern}`}
                          onClick={() => setDeleteTarget(rule)}
                        >
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Stack>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editingId ? 'Edit rule' : 'Add rule'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Pattern"
              helperText="Matched against the transaction's merchant and description (case- and accent-insensitive)."
              value={form.pattern}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, pattern: event.target.value }))
              }
              fullWidth
              autoFocus
            />
            <TextField
              select
              label="Category"
              value={form.category}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  category: event.target.value as Entry.Category,
                }))
              }
              fullWidth
            >
              {ALL_CATEGORIES.map((category) => (
                <MenuItem key={category} value={category}>
                  {CATEGORY_LABELS[category]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Applies to"
              value={form.flow}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  flow: event.target.value as FlowChoice,
                }))
              }
              fullWidth
            >
              {(['any', 'outcome', 'income'] as FlowChoice[]).map((flow) => (
                <MenuItem key={flow} value={flow}>
                  {FLOW_LABELS[flow]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Priority (optional)"
              type="number"
              helperText="Lower numbers are evaluated first. Leave blank to append."
              value={form.priority}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, priority: event.target.value }))
              }
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeDialog} disabled={pending}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={pending}>
            {editingId ? 'Save' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete rule?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete the rule for &ldquo;{deleteTarget?.pattern}&rdquo;? This cannot
            be undone. Existing transactions keep their current category.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={pending}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={pending}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
