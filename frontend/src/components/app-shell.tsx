"use client";

import {
  BarChart3,
  Bot,
  Headphones,
  Megaphone,
  Moon,
  Settings,
  Sun,
  UserRoundCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import { withBasePath } from "@/lib/base-path";
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

type ThemeMode = "light" | "dark";

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
  const [theme, setTheme] = useState<ThemeMode>("light");
  const defaultWorkspace = useMemo(() => defaultWorkspaceForRole(persona), [persona]);
  const isDark = theme === "dark";

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("bx-caller-theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
      return;
    }
    if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("bx-caller-theme", theme);
  }, [theme]);

  return (
    <div className={cn("min-h-screen", isDark ? "dark bg-slate-950 text-slate-100" : "bg-[#f6f8fb] text-ink")}>
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white px-4 py-5 dark:border-slate-800 dark:bg-slate-950 lg:block">
        <div className="mb-7">
          <div className="text-lg font-semibold">BX Caller</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">AI Call Center</div>
        </div>
        <nav aria-label="Workspaces" className="space-y-1">
          {workspaces.map((workspace) => {
            const Icon = iconByWorkspace[workspace.id];
            return (
              <a
                key={workspace.id}
                href={withBasePath(workspace.href)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-ink dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white",
                  workspace.id === activeWorkspaceId &&
                    "bg-ink text-white hover:bg-ink hover:text-white dark:bg-cyan dark:text-slate-950 dark:hover:bg-cyan dark:hover:text-slate-950",
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
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Default workspace: {defaultWorkspace.label}
              </div>
              <h1 className="text-2xl font-semibold">AI Call Center</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
                title={isDark ? "Switch to light theme" : "Switch to dark theme"}
                onClick={() => setTheme(isDark ? "light" : "dark")}
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                Local persona
                <select
                  className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-ink dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
          </div>
        </header>
        <main className="px-5 py-6">{children}</main>
      </div>
    </div>
  );
}
