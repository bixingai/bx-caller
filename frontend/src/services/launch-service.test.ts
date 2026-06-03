import { describe, expect, it, vi } from "vitest";

import { createLaunchService } from "./launch-service";

describe("launch service", () => {
  it("maps contacts from backend snake_case fields", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      contacts: [
        {
          id: "contact-1",
          name: "Ada Chen",
          phone_number: "+19495080666",
          email: "ada@example.com",
          company: "Example Co",
          tags: ["priority"],
          notes: "Asked for callback",
          created_at: "2026-06-03T00:00:00Z",
          updated_at: "2026-06-03T00:00:00Z",
        },
      ],
    });

    await expect(createLaunchService(fetcher).listContacts()).resolves.toEqual([
      {
        id: "contact-1",
        name: "Ada Chen",
        phoneNumber: "+19495080666",
        email: "ada@example.com",
        company: "Example Co",
        tags: ["priority"],
        notes: "Asked for callback",
        createdAt: "2026-06-03T00:00:00Z",
        updatedAt: "2026-06-03T00:00:00Z",
      },
    ]);
  });

  it("creates campaigns using backend payload names", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      id: "campaign-1",
      name: "June Renewal",
      agent_id: "agent-1",
      contact_ids: ["contact-1"],
      script: "Renewal check-in",
      schedule: "immediate",
      status: "draft",
      created_at: "2026-06-03T00:00:00Z",
      updated_at: "2026-06-03T00:00:00Z",
      launched_at: null,
    });

    const campaign = await createLaunchService(fetcher).createCampaign({
      name: "June Renewal",
      agentId: "agent-1",
      contactIds: ["contact-1"],
      script: "Renewal check-in",
    });

    expect(campaign.agentId).toBe("agent-1");
    expect(fetcher).toHaveBeenCalledWith("/campaigns", {
      method: "POST",
      body: JSON.stringify({
        name: "June Renewal",
        agent_id: "agent-1",
        contact_ids: ["contact-1"],
        script: "Renewal check-in",
        schedule: "immediate",
      }),
    });
  });

  it("launches a campaign and maps created call sessions", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      campaign: {
        id: "campaign-1",
        name: "June Renewal",
        agent_id: "agent-1",
        contact_ids: ["contact-1"],
        script: "Renewal check-in",
        schedule: "immediate",
        status: "launched",
        created_at: "2026-06-03T00:00:00Z",
        updated_at: "2026-06-03T00:01:00Z",
        launched_at: "2026-06-03T00:01:00Z",
      },
      sessions: [
        {
          id: "session-1",
          campaign_id: "campaign-1",
          agent_id: "agent-1",
          contact_id: "contact-1",
          contact_name: "Ada Chen",
          to_number: "+19495080666",
          provider: "twilio",
          provider_call_id: "CA1",
          status: "queued",
          created_at: "2026-06-03T00:01:00Z",
          updated_at: "2026-06-03T00:01:00Z",
        },
      ],
    });

    const result = await createLaunchService(fetcher).launchCampaign("campaign-1", true);

    expect(result.campaign.status).toBe("launched");
    expect(result.sessions[0]).toMatchObject({
      campaignId: "campaign-1",
      contactName: "Ada Chen",
      providerCallId: "CA1",
    });
    expect(fetcher).toHaveBeenCalledWith("/campaigns/campaign-1/launch", {
      method: "POST",
      body: JSON.stringify({ compliance_ack: true }),
    });
  });

  it("reads provider readiness and audit logs", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ provider: "twilio", ready: false, missing: ["TWILIO_AUTH_TOKEN"] })
      .mockResolvedValueOnce({
        audit_logs: [
          {
            id: "audit-1",
            event: "campaign.launched",
            entity_id: "campaign-1",
            details: { session_count: 1 },
            created_at: "2026-06-03T00:01:00Z",
          },
        ],
      });
    const service = createLaunchService(fetcher);

    await expect(service.getProviderReadiness()).resolves.toEqual({
      provider: "twilio",
      ready: false,
      missing: ["TWILIO_AUTH_TOKEN"],
    });
    await expect(service.listAuditLogs()).resolves.toEqual([
      {
        id: "audit-1",
        event: "campaign.launched",
        entityId: "campaign-1",
        details: { session_count: 1 },
        createdAt: "2026-06-03T00:01:00Z",
      },
    ]);
  });
});
