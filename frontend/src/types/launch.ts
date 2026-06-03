export interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  email: string;
  company: string;
  tags: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactDraft {
  name: string;
  phoneNumber: string;
  email?: string;
  company?: string;
  tags?: string[];
  notes?: string;
}

export interface Campaign {
  id: string;
  name: string;
  agentId: string;
  contactIds: string[];
  script: string;
  schedule: string;
  status: "draft" | "launched" | "paused" | "completed" | string;
  createdAt: string;
  updatedAt: string;
  launchedAt?: string | null;
}

export interface CampaignDraft {
  name: string;
  agentId: string;
  contactIds: string[];
  script?: string;
  schedule?: string;
}

export interface CallSession {
  id: string;
  campaignId: string;
  agentId: string;
  contactId: string;
  contactName: string;
  toNumber: string;
  provider: string;
  providerCallId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  event: string;
  entityId: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface ProviderReadiness {
  provider: string;
  ready: boolean;
  missing: string[];
}

export interface CampaignLaunchResult {
  campaign: Campaign;
  sessions: CallSession[];
}
