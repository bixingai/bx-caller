import { AppShell } from "@/components/app-shell";
import { CampaignControlWorkspace } from "@/features/campaigns/campaign-control-workspace";

export default function CampaignsPage() {
  return (
    <AppShell activeWorkspaceId="campaigns">
      <CampaignControlWorkspace />
    </AppShell>
  );
}

