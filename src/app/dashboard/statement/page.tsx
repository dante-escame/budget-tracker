import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export default function StatementPage() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 8 } }}>
      <Stack spacing={1}>
        <Typography variant="overline" color="primary.dark">
          Transactions
        </Typography>
        <Typography variant="h4" component="h1" color="text.primary">
          Statement
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Your income and expense history will appear here.
        </Typography>
      </Stack>
    </Container>
  );
}
