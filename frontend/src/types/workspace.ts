export type PersonaRole =
  | "ceo"
  | "operations-manager"
  | "marketing-manager"
  | "supervisor"
  | "support-rep";

export interface Persona {
  id: PersonaRole;
  name: string;
  title: string;
}

export interface WorkspaceDefinition {
  id: "executive" | "agents" | "campaigns" | "live" | "desk" | "settings";
  label: string;
  href: string;
  role: PersonaRole;
  description: string;
}

export interface CampaignMock {
  id: string;
  name: string;
  status: "draft" | "scheduled" | "paused";
  audience: string;
  agentName: string;
  compliance: "ready" | "review";
  conversionRate: number;
}

export interface CampaignService {
  listCampaigns(): Promise<CampaignMock[]>;
  launchCampaign(id: string): Promise<{ kind: "mock-only"; message: string }>;
}

export interface LiveCallMock {
  id: string;
  caller: string;
  agentName: string;
  sentiment: "positive" | "neutral" | "at-risk";
  elapsed: string;
  transcript: string[];
}

export interface ContactMock {
  id: string;
  name: string;
  company: string;
  lastOutcome: string;
  nextAction: string;
}

