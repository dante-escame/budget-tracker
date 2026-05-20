import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { SignInForm } from '@/components/auth/sign-in-form';
import { redirectIfAuthenticated } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

export default async function SignInPage() {
  await redirectIfAuthenticated('/dashboard');

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: { xs: 6, md: 8 },
        background:
          'linear-gradient(180deg, rgba(255, 248, 199, 0.95) 0%, rgba(250, 251, 233, 1) 42%, rgba(255, 255, 255, 1) 100%)',
      }}
    >
      <Container maxWidth="sm">
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography variant="overline" color="primary.dark">
              Budget Tracker
            </Typography>
            <Typography
              variant="h4"
              component="h1"
              color="text.primary"
              sx={{ letterSpacing: '-0.03em' }}
            >
              Welcome back.
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Sign in to pick up where you left off and keep your finances on track.
            </Typography>
          </Stack>
          <SignInForm />
        </Stack>
      </Container>
    </Box>
  );
}
