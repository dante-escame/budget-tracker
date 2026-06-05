import Box from '@mui/material/Box';

import { AppSidebar } from '@/components/layout/AppSidebar';
import { requireVerifiedAuthenticatedUser } from '@/lib/auth/guards';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireVerifiedAuthenticatedUser();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppSidebar />
      <Box component="main" sx={{ flexGrow: 1, overflow: 'auto' }}>
        {children}
      </Box>
    </Box>
  );
}
