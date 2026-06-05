import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { LandingActions } from '@/components/auth/landing-actions';
import { redirectIfAuthenticated } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

export default async function Home() {
  await redirectIfAuthenticated('/dashboard');

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        py: { xs: 6, md: 10 },
        background:
          'linear-gradient(180deg, rgba(255, 248, 199, 0.95) 0%, rgba(250, 251, 233, 1) 42%, rgba(255, 255, 255, 1) 100%)',
      }}
    >
      <Container maxWidth="md">
        <Stack spacing={6}>
          <Stack spacing={2}>
            <Typography variant="overline" color="primary.dark">
              Budget Tracker
            </Typography>
            <Typography
              variant="h2"
              component="h1"
              color="text.primary"
              sx={{ maxWidth: 640, letterSpacing: '-0.03em' }}
            >
              Calm money tracking starts with a cleaner sign-in flow.
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ maxWidth: 560, fontWeight: 400 }}
            >
              Create an account, verify access, and move into a lightweight
              protected workspace prepared for the next budgeting features.
            </Typography>
          </Stack>

          <LandingActions />

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
            }}
          >
            <Card
              sx={{
                bgcolor: 'secondary.light',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <CardContent>
                <Stack spacing={1.5}>
                  <Typography variant="h6" component="h2">
                    Security-first foundation
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Session cookies, email verification, reset tokens, and
                    protected server routes are all wired into the app router
                    flow.
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
            <Card
              sx={{
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <CardContent>
                <Stack spacing={1.5}>
                  <Typography variant="h6" component="h2">
                    Built for finance clarity
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Light green structure, light yellow atmosphere, and a
                    restrained surface system keep the product readable before
                    the dashboard arrives.
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
