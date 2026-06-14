import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { SecuritySection } from '@/components/settings/SecuritySection';

export default function SettingsPage() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 8 } }}>
      <Stack spacing={4}>
        <Stack spacing={1}>
          <Typography variant="overline" color="primary.dark">
            Account
          </Typography>
          <Typography variant="h4" component="h1" color="text.primary">
            Settings
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage how you sign in and protect your account.
          </Typography>
        </Stack>

        <SecuritySection />
      </Stack>
    </Container>
  );
}
