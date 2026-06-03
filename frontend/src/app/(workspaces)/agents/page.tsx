import { AppShell } from "@/components/app-shell";
import { AgentBuilderWorkspace } from "@/features/agents/agent-builder-workspace";

export default function AgentsPage() {
  return (
    <AppShell activeWorkspaceId="agents">
      <AgentBuilderWorkspace />
    </AppShell>
  );
}

