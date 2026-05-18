import { Suspense } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { TokenActionForm } from '@/components/auth/token-action-form';

export default function ResetPasswordPage() {
  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        py: { xs: 6, md: 10 },
        bgcolor: 'background.default',
      }}
    >
      <Container maxWidth="sm">
        <Stack spacing={3}>
          <Typography variant="overline" color="primary.dark">
            Budget Tracker
          </Typography>
          <Suspense fallback={null}>
            <TokenActionForm kind="reset_password" />
          </Suspense>
        </Stack>
      </Container>
    </Box>
  );
}
