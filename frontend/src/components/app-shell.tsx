"use client";

import {
  BarChart3,
  Bot,
  Headphones,
  Megaphone,
  Settings,
  UserRoundCheck,
} from "lucide-react";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import { HealthStatus } from "@/components/health-status";
import { defaultWorkspaceForRole, personas, workspaces } from "@/services/workspaces";
import type { PersonaRole, WorkspaceDefinition } from "@/types/workspace";

const iconByWorkspace: Record<WorkspaceDefinition["id"], React.ComponentType<{ className?: string }>> = {
  executive: BarChart3,
  agents: Bot,
  campaigns: Megaphone,
  live: Headphones,
  desk: UserRoundCheck,
  settings: Settings,
};

export function AppShell({
  activeWorkspaceId,
  children,
  showHealth = true,
}: Readonly<{
  activeWorkspaceId: WorkspaceDefinition["id"];
  children: React.ReactNode;
  showHealth?: boolean;
}>) {
  const [persona, setPersona] = useState<PersonaRole>("operations-manager");
  const defaultWorkspace = useMemo(() => defaultWorkspaceForRole(persona), [persona]);

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-ink">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white px-4 py-5 lg:block">
        <div className="mb-7">
          <div className="text-lg font-semibold">BX Caller</div>
          <div className="text-sm text-slate-500">AI Call Center</div>
        </div>
        <nav aria-label="Workspaces" className="space-y-1">
          {workspaces.map((workspace) => {
            const Icon = iconByWorkspace[workspace.id];
            return (
              <a
                key={workspace.id}
                href={workspace.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-ink",
                  workspace.id === activeWorkspaceId && "bg-ink text-white hover:bg-ink hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                {workspace.label}
              </a>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-medium text-slate-500">
                Default workspace: {defaultWorkspace.label}
              </div>
              <h1 className="text-2xl font-semibold">AI Call Center</h1>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
              Local persona
              <select
                className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-ink"
                value={persona}
                onChange={(event) => setPersona(event.target.value as PersonaRole)}
              >
                {personas.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            {showHealth ? <HealthStatus /> : null}
          </div>
        </header>
        <main className="px-5 py-6">{children}</main>
      </div>
    </div>
  );
}
