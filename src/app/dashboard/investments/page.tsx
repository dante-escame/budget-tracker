import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export default function InvestmentsPage() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 8 } }}>
      <Stack spacing={1}>
        <Typography variant="overline" color="primary.dark">
          Portfolio
        </Typography>
        <Typography variant="h4" component="h1" color="text.primary">
          Investments
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Your investment portfolio and performance will appear here.
        </Typography>
      </Stack>
    </Container>
  );
}
