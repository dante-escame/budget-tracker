import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export default function ObjectivesPage() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 8 } }}>
      <Stack spacing={1}>
        <Typography variant="overline" color="primary.dark">
          Goals
        </Typography>
        <Typography variant="h4" component="h1" color="text.primary">
          Objectives
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Your financial goals and progress will appear here.
        </Typography>
      </Stack>
    </Container>
  );
}
