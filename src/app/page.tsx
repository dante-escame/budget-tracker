import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export default function Home() {
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
            <Typography variant="overline" color="primary.dark">
              Budget Tracker
            </Typography>
            <Typography variant="h3" component="h1" color="text.primary">
              Coming soon
            </Typography>
            <Typography variant="body1" color="text.secondary">
              A calm, finance-first app for tracking income, expenses, and
              budgets. Built with Next.js, React, and MUI on a light green and
              light yellow visual identity.
            </Typography>
          </Stack>

          <Card
            sx={{
              bgcolor: 'secondary.light',
              borderTop: '3px solid',
              borderTopColor: 'primary.main',
            }}
          >
            <CardContent>
              <Stack spacing={1.5}>
                <Typography variant="h6" component="h2" color="text.primary">
                  Stack baseline
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Next.js 16 App Router, React 19, TypeScript strict, MUI with
                  Emotion. Theme tokens centralized in{' '}
                  <Box
                    component="code"
                    sx={{
                      fontFamily: 'var(--font-roboto-mono), monospace',
                      bgcolor: 'background.paper',
                      px: 0.75,
                      py: 0.25,
                      borderRadius: 1,
                    }}
                  >
                    src/theme/theme.ts
                  </Box>
                  .
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button variant="contained" color="primary" size="large">
              Get started
            </Button>
            <Button variant="outlined" color="primary" size="large">
              View documentation
            </Button>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
