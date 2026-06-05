import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { requireVerifiedAuthenticatedUser } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await requireVerifiedAuthenticatedUser();

  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 8 } }}>
      <Stack spacing={4}>
        <Stack spacing={1}>
          <Typography variant="overline" color="primary.dark">
            Dashboard
          </Typography>
          <Typography variant="h4" component="h1" color="text.primary">
            Welcome back
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Here&apos;s an overview of your finances.
          </Typography>
        </Stack>

        <Card
          sx={{
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <CardContent>
            <Stack spacing={1.5}>
              <Typography variant="h6" component="h2" color="text.primary">
                Account
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
  );
}
