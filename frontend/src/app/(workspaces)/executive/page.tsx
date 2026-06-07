import { AppShell } from "@/components/app-shell";
import { ExecutiveWorkspace } from "@/features/executive/executive-workspace";

export default function ExecutivePage() {
  return (
    <AppShell activeWorkspaceId="executive">
      <ExecutiveWorkspace />
    </AppShell>
  );
}

