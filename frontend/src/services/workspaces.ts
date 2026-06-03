import type { Persona, PersonaRole, WorkspaceDefinition } from "@/types/workspace";

export const personas: Persona[] = [
  { id: "ceo", name: "Anita", title: "CEO" },
  { id: "operations-manager", name: "Marcus", title: "Operations Manager" },
  { id: "marketing-manager", name: "Leah", title: "Growth Manager" },
  { id: "supervisor", name: "Sam", title: "Live Support Supervisor" },
  { id: "support-rep", name: "Nora", title: "Account Manager" },
];

export const workspaces: WorkspaceDefinition[] = [
  {
    id: "executive",
    label: "Executive",
    href: "/executive",
    role: "ceo",
    description: "Business health, risk, and outcome metrics.",
  },
  {
    id: "agents",
    label: "Agents",
    href: "/agents",
    role: "operations-manager",
    description: "Build and maintain AI phone agents.",
  },
  {
    id: "campaigns",
    label: "Campaigns",
    href: "/campaigns",
    role: "marketing-manager",
    description: "Plan outbound campaigns and review outcomes.",
  },
  {
    id: "live",
    label: "Live",
    href: "/live",
    role: "supervisor",
    description: "Monitor active calls and escalations.",
  },
  {
    id: "desk",
    label: "Desk",
    href: "/desk",
    role: "support-rep",
    description: "Review customers, summaries, and next actions.",
  },
];

export function defaultWorkspaceForRole(role: PersonaRole): WorkspaceDefinition {
  return workspaces.find((workspace) => workspace.role === role) ?? workspaces[0];
}

