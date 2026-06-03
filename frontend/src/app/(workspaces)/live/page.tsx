import { AppShell } from "@/components/app-shell";
import { LiveCockpitWorkspace } from "@/features/live/live-cockpit-workspace";

export default function LivePage() {
  return (
    <AppShell activeWorkspaceId="live">
      <LiveCockpitWorkspace />
    </AppShell>
  );
}

