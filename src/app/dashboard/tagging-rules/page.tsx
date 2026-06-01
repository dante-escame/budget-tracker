import { requireVerifiedAuthenticatedUser } from '@/lib/auth/guards';
import { getEntryService } from '@/lib/entries/runtime';
import { TaggingRulesView } from '@/components/tagging-rules/TaggingRulesView';

export const dynamic = 'force-dynamic';

export default async function TaggingRulesPage() {
  const user = await requireVerifiedAuthenticatedUser();
  const entryService = await getEntryService();

  const rules = await entryService.listTaggingRules(user.id);

  return <TaggingRulesView rules={rules} />;
}
