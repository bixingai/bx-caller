import { AppShell } from "@/components/app-shell";
import { CrmCallDeskWorkspace } from "@/features/desk/crm-call-desk-workspace";

export default function DeskPage() {
  return (
    <AppShell activeWorkspaceId="desk">
      <CrmCallDeskWorkspace />
    </AppShell>
  );
}
