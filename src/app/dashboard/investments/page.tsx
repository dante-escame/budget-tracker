import { requireVerifiedAuthenticatedUser } from '@/lib/auth/guards';
import { getInvestmentService } from '@/lib/investments/runtime';
import { InvestmentsView } from '@/components/investments/InvestmentsView';

export const dynamic = 'force-dynamic';

export default async function InvestmentsPage() {
  const user = await requireVerifiedAuthenticatedUser();
  const investmentService = await getInvestmentService();

  const [positions, applications] = await Promise.all([
    investmentService.listPortfolio(user.id),
    investmentService.listApplications(user.id),
  ]);

  return <InvestmentsView positions={positions} applications={applications} />;
}
