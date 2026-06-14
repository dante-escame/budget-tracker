'use client';

import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import KeyRoundedIcon from '@mui/icons-material/KeyRounded';
import MailRoundedIcon from '@mui/icons-material/MailRounded';
import PhoneIphoneRoundedIcon from '@mui/icons-material/PhoneIphoneRounded';

import type { Auth } from '@/lib/auth';
import { EnrollMethodDialog } from '@/components/settings/EnrollMethodDialog';
import { BackupCodesDialog } from '@/components/settings/BackupCodesDialog';

interface MethodSummary {
  type: Auth.MfaMethodType;
  status: Auth.MfaMethodStatus;
}

interface MethodConfig {
  type: Auth.MfaMethodType;
  label: string;
  description: string;
  Icon: React.ElementType;
}

const METHODS: MethodConfig[] = [
  {
    type: 'totp',
    label: 'Authenticator app',
    description: 'Use Google Authenticator, Authy, or a similar app to generate codes.',
    Icon: PhoneIphoneRoundedIcon,
  },
  {
    type: 'email',
    label: 'Email code',
    description: 'Receive a one-time code by email when you sign in.',
    Icon: MailRoundedIcon,
  },
];

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? 'Something went wrong.';
  } catch {
    return 'Something went wrong.';
  }
}

export function SecuritySection() {
  const [methods, setMethods] = useState<MethodSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingType, setPendingType] = useState<Auth.MfaMethodType | null>(null);

  const [enrollType, setEnrollType] = useState<Auth.MfaMethodType | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [backupOpen, setBackupOpen] = useState(false);

  const loadMethods = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch('/api/auth/mfa/methods');
      if (!response.ok) throw new Error(await readError(response));
      const body = (await response.json()) as { methods: MethodSummary[] };
      setMethods(body.methods);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMethods();
  }, [loadMethods]);

  const isActive = (type: Auth.MfaMethodType) =>
    methods.some((method) => method.type === type && method.status === 'active');

  const anyActive = methods.some((method) => method.status === 'active');

  async function handleRemove(type: Auth.MfaMethodType) {
    setError(null);
    setPendingType(type);
    try {
      const response = await fetch('/api/auth/mfa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      if (!response.ok) throw new Error(await readError(response));
      await loadMethods();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to disable the method.');
    } finally {
      setPendingType(null);
    }
  }

  function handleEnrolled(codes: string[]) {
    setEnrollType(null);
    void loadMethods();
    if (codes.length > 0) {
      setBackupCodes(codes);
      setBackupOpen(true);
    }
  }

  return (
    <Card sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
        <Stack spacing={3}>
          <Stack spacing={0.5}>
            <Typography variant="h6" component="h2" color="text.primary" sx={{ fontWeight: 700 }}>
              Two-factor authentication
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add a second step at sign-in so a stolen password is not enough to reach your data.
            </Typography>
          </Stack>

          {error ? <Alert severity="error">{error}</Alert> : null}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            <Stack divider={<Divider flexItem />} spacing={2}>
              {METHODS.map(({ type, label, description, Icon }) => {
                const active = isActive(type);
                return (
                  <Stack
                    key={type}
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    sx={{ alignItems: { sm: 'center' } }}
                  >
                    <Icon sx={{ color: 'text.secondary', fontSize: 26 }} />
                    <Box sx={{ flexGrow: 1 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Typography color="text.primary" sx={{ fontWeight: 600 }}>
                          {label}
                        </Typography>
                        <Chip
                          size="small"
                          label={active ? 'On' : 'Off'}
                          color={active ? 'success' : 'default'}
                          variant={active ? 'filled' : 'outlined'}
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {description}
                      </Typography>
                    </Box>
                    {active ? (
                      <Button
                        variant="outlined"
                        color="error"
                        disabled={pendingType === type}
                        onClick={() => void handleRemove(type)}
                      >
                        {pendingType === type ? 'Removing…' : 'Remove'}
                      </Button>
                    ) : (
                      <Button variant="contained" onClick={() => setEnrollType(type)}>
                        Add
                      </Button>
                    )}
                  </Stack>
                );
              })}

              {anyActive ? (
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  sx={{ alignItems: { sm: 'center' } }}
                >
                  <KeyRoundedIcon sx={{ color: 'text.secondary', fontSize: 26 }} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography color="text.primary" sx={{ fontWeight: 600 }}>
                      Backup codes
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      One-time codes to sign in if you lose access to your other methods.
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setBackupCodes(null);
                      setBackupOpen(true);
                    }}
                  >
                    Regenerate
                  </Button>
                </Stack>
              ) : null}
            </Stack>
          )}
        </Stack>
      </CardContent>

      {enrollType ? (
        <EnrollMethodDialog
          key={enrollType}
          type={enrollType}
          onClose={() => setEnrollType(null)}
          onEnrolled={handleEnrolled}
        />
      ) : null}

      <BackupCodesDialog
        open={backupOpen}
        codes={backupCodes}
        onClose={() => setBackupOpen(false)}
      />
    </Card>
  );
}
