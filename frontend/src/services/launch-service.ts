import { apiFetch } from "@/lib/api-client";
import type {
  AuditLog,
  CallSession,
  Campaign,
  CampaignDraft,
  CampaignLaunchResult,
  Contact,
  ContactDraft,
  ProviderReadiness,
} from "@/types/launch";

type Fetcher = <T>(path: string, options?: RequestInit) => Promise<T>;

type BackendContact = Omit<Contact, "phoneNumber" | "createdAt" | "updatedAt"> & {
  phone_number: string;
  created_at: string;
  updated_at: string;
};

type BackendCampaign = Omit<Campaign, "agentId" | "contactIds" | "createdAt" | "updatedAt" | "launchedAt"> & {
  agent_id: string;
  contact_ids: string[];
  created_at: string;
  updated_at: string;
  launched_at?: string | null;
};

type BackendCallSession = Omit<
  CallSession,
  "campaignId" | "agentId" | "contactId" | "contactName" | "toNumber" | "providerCallId" | "createdAt" | "updatedAt"
> & {
  campaign_id: string;
  agent_id: string;
  contact_id: string;
  contact_name: string;
  to_number: string;
  provider_call_id: string;
  created_at: string;
  updated_at: string;
};

type BackendAuditLog = Omit<AuditLog, "entityId" | "createdAt"> & {
  entity_id: string;
  created_at: string;
};

function contactToBackend(draft: ContactDraft) {
  return {
    name: draft.name,
    phone_number: draft.phoneNumber,
    email: draft.email ?? "",
    company: draft.company ?? "",
    tags: draft.tags ?? [],
    notes: draft.notes ?? "",
  };
}

function campaignToBackend(draft: CampaignDraft) {
  return {
    name: draft.name,
    agent_id: draft.agentId,
    contact_ids: draft.contactIds,
    script: draft.script ?? "",
    schedule: draft.schedule ?? "immediate",
  };
}

function mapContact(contact: BackendContact): Contact {
  return {
    id: contact.id,
    name: contact.name,
    phoneNumber: contact.phone_number,
    email: contact.email,
    company: contact.company,
    tags: contact.tags,
    notes: contact.notes,
    createdAt: contact.created_at,
    updatedAt: contact.updated_at,
  };
}

function mapCampaign(campaign: BackendCampaign): Campaign {
  return {
    id: campaign.id,
    name: campaign.name,
    agentId: campaign.agent_id,
    contactIds: campaign.contact_ids,
    script: campaign.script,
    schedule: campaign.schedule,
    status: campaign.status,
    createdAt: campaign.created_at,
    updatedAt: campaign.updated_at,
    launchedAt: campaign.launched_at,
  };
}

function mapSession(session: BackendCallSession): CallSession {
  return {
    id: session.id,
    campaignId: session.campaign_id,
    agentId: session.agent_id,
    contactId: session.contact_id,
    contactName: session.contact_name,
    toNumber: session.to_number,
    provider: session.provider,
    providerCallId: session.provider_call_id,
    status: session.status,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
  };
}

function mapAuditLog(log: BackendAuditLog): AuditLog {
  return {
    id: log.id,
    event: log.event,
    entityId: log.entity_id,
    details: log.details,
    createdAt: log.created_at,
  };
}

export interface LaunchService {
  listContacts(): Promise<Contact[]>;
  createContact(draft: ContactDraft): Promise<Contact>;
  listCampaigns(): Promise<Campaign[]>;
  createCampaign(draft: CampaignDraft): Promise<Campaign>;
  launchCampaign(id: string, complianceAck: boolean): Promise<CampaignLaunchResult>;
  listCallSessions(): Promise<CallSession[]>;
  listAuditLogs(): Promise<AuditLog[]>;
  getProviderReadiness(): Promise<ProviderReadiness>;
}

export function createLaunchService(fetcher: Fetcher = apiFetch): LaunchService {
  return {
    async listContacts() {
      const response = await fetcher<{ contacts: BackendContact[] }>("/contacts");
      return response.contacts.map(mapContact);
    },
    async createContact(draft) {
      const response = await fetcher<BackendContact>("/contacts", {
        method: "POST",
        body: JSON.stringify(contactToBackend(draft)),
      });
      return mapContact(response);
    },
    async listCampaigns() {
      const response = await fetcher<{ campaigns: BackendCampaign[] }>("/campaigns");
      return response.campaigns.map(mapCampaign);
    },
    async createCampaign(draft) {
      const response = await fetcher<BackendCampaign>("/campaigns", {
        method: "POST",
        body: JSON.stringify(campaignToBackend(draft)),
      });
      return mapCampaign(response);
    },
    async launchCampaign(id, complianceAck) {
      const response = await fetcher<{
        campaign: BackendCampaign;
        sessions: BackendCallSession[];
      }>(`/campaigns/${id}/launch`, {
        method: "POST",
        body: JSON.stringify({ compliance_ack: complianceAck }),
      });
      return {
        campaign: mapCampaign(response.campaign),
        sessions: response.sessions.map(mapSession),
      };
    },
    async listCallSessions() {
      const response = await fetcher<{ call_sessions: BackendCallSession[] }>("/call-sessions");
      return response.call_sessions.map(mapSession);
    },
    async listAuditLogs() {
      const response = await fetcher<{ audit_logs: BackendAuditLog[] }>("/audit-logs");
      return response.audit_logs.map(mapAuditLog);
    },
    async getProviderReadiness() {
      return fetcher<ProviderReadiness>("/provider-readiness");
    },
  };
}
