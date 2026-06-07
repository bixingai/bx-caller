import type { CampaignMock, CampaignService, ContactMock, LiveCallMock } from "@/types/workspace";
import type { BackendHealth } from "@/types/health";

export function createMockCampaignService(): CampaignService {
  const campaigns: CampaignMock[] = [
    {
      id: "campaign-1",
      name: "Spring Renewal Outreach",
      status: "scheduled",
      audience: "1,280 renewal accounts",
      agentName: "Retention Agent",
      compliance: "ready",
      conversionRate: 18.4,
    },
    {
      id: "campaign-2",
      name: "Demo Follow-up",
      status: "draft",
      audience: "430 trial leads",
      agentName: "Sales Qualifier",
      compliance: "review",
      conversionRate: 11.2,
    },
  ];

  return {
    async listCampaigns() {
      return campaigns;
    },
    async launchCampaign() {
      return {
        kind: "mock-only",
        message: "Campaign launch is scaffolded; no calls were dialed.",
      };
    },
  };
}

export async function getMockExecutiveMetrics(health: BackendHealth) {
  return {
    health,
    liveCalls: 42,
    resolutionRate: 73,
    escalationRate: 9,
    averageLatencyMs: 420,
    revenueInfluenced: "$128K",
  };
}

export async function getMockLiveCalls(): Promise<LiveCallMock[]> {
  return [
    {
      id: "call-1",
      caller: "+1 415 555 0188",
      agentName: "Reception Agent",
      sentiment: "neutral",
      elapsed: "03:12",
      transcript: ["Caller asked for billing help.", "AI confirmed account context."],
    },
    {
      id: "call-2",
      caller: "+1 650 555 0144",
      agentName: "Retention Agent",
      sentiment: "at-risk",
      elapsed: "07:45",
      transcript: ["Caller mentioned cancellation.", "Supervisor handoff recommended."],
    },
  ];
}

export async function getMockContacts(): Promise<ContactMock[]> {
  return [
    {
      id: "contact-1",
      name: "Grace Liu",
      company: "Northstar Clinics",
      lastOutcome: "Requested pricing follow-up",
      nextAction: "Send ROI summary",
    },
    {
      id: "contact-2",
      name: "Daniel Park",
      company: "Harbor Logistics",
      lastOutcome: "Escalated to human supervisor",
      nextAction: "Review recording",
    },
  ];
}
