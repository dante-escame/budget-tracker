import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { SignOutButton } from '@/components/auth/sign-out-button';
import { requireVerifiedAuthenticatedUser } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

export default async function AppPage() {
  const user = await requireVerifiedAuthenticatedUser();

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        py: { xs: 6, md: 10 },
        bgcolor: 'background.default',
      }}
    >
      <Container maxWidth="md">
        <Stack spacing={4}>
          <Stack spacing={1.5}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 2,
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
              }}
            >
              <Box>
                <Typography variant="overline" color="primary.dark">
                  Protected Area
                </Typography>
                <Typography variant="h3" component="h1" color="text.primary">
                  Auth is wired
                </Typography>
              </Box>
              <SignOutButton />
            </Box>
            <Typography variant="body1" color="text.secondary">
              This route is protected by the server-side auth guard and only
              renders for verified users.
            </Typography>
          </Stack>

          <Card
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <CardContent>
              <Stack spacing={1.5}>
                <Typography variant="h6" component="h2" color="text.primary">
                  Signed-in user
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user.emailDisplay}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Status: {user.status}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}
