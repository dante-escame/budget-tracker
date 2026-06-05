import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { SignUpForm } from '@/components/auth/sign-up-form';
import { redirectIfAuthenticated } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

export default async function SignUpPage() {
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
              Start tracking your money, calmly.
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Create a free account and step into a lightweight workspace built
              for financial clarity.
            </Typography>
          </Stack>
          <SignUpForm />
        </Stack>
      </Container>
    </Box>
  );
}
