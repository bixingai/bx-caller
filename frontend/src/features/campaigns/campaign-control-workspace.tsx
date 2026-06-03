"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { createAgentService } from "@/services/agent-service";
import { createLaunchService } from "@/services/launch-service";
import type { AgentSummary } from "@/types/agent";
import type { Campaign, Contact, ProviderReadiness } from "@/types/launch";

const launchService = createLaunchService();
const agentService = createAgentService();

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Operation failed";
}

export function CampaignControlWorkspace() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [readiness, setReadiness] = useState<ProviderReadiness | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [complianceAck, setComplianceAck] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadLaunchData() {
    setLoading(true);
    setError("");
    try {
      const [nextContacts, nextCampaigns, nextAgents, nextReadiness] = await Promise.all([
        launchService.listContacts(),
        launchService.listCampaigns(),
        agentService.listAgents(),
        launchService.getProviderReadiness(),
      ]);
      setContacts(nextContacts);
      setCampaigns(nextCampaigns);
      setAgents(nextAgents);
      setReadiness(nextReadiness);
      setSelectedAgentId((current) => current || nextAgents[0]?.id || "");
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLaunchData();
  }, []);

  const launchableCampaigns = useMemo(
    () => campaigns.filter((campaign) => campaign.status !== "launched"),
    [campaigns],
  );

  async function createContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!contactName.trim() || !contactPhone.trim()) {
      setError("Contact name and phone are required");
      return;
    }
    try {
      await launchService.createContact({ name: contactName, phoneNumber: contactPhone });
      setContactName("");
      setContactPhone("");
      await loadLaunchData();
    } catch (createError) {
      setError(errorMessage(createError));
    }
  }

  async function createCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!campaignName.trim() || !selectedAgentId || selectedContactIds.length === 0) {
      setError("Campaign name, agent, and at least one contact are required");
      return;
    }
    try {
      await launchService.createCampaign({
        name: campaignName,
        agentId: selectedAgentId,
        contactIds: selectedContactIds,
        script: "AI renewal and follow-up call",
      });
      setCampaignName("");
      setSelectedContactIds([]);
      await loadLaunchData();
    } catch (createError) {
      setError(errorMessage(createError));
    }
  }

  async function launchCampaign(campaign: Campaign) {
    try {
      await launchService.launchCampaign(campaign.id, complianceAck);
      setComplianceAck(false);
      await loadLaunchData();
    } catch (launchError) {
      setError(errorMessage(launchError));
    }
  }

  function toggleContact(contactId: string) {
    setSelectedContactIds((current) =>
      current.includes(contactId) ? current.filter((id) => id !== contactId) : [...current, contactId],
    );
  }

  const providerReady = readiness?.ready ?? false;
  const isCampaignLaunchable = (campaign: Campaign) =>
    providerReady && complianceAck && launchableCampaigns.some((item) => item.id === campaign.id);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Outbound Campaign Control</h2>
        <p className="text-sm text-slate-500">Create launch-ready campaigns backed by bx-caller APIs.</p>
      </div>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-4">
          <Panel>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold">Provider readiness</h3>
              <Badge tone={providerReady ? "success" : "warning"}>{providerReady ? "ready" : "needs setup"}</Badge>
            </div>
            <p className="mt-3 text-sm text-slate-500">
              {readiness && !readiness.ready
                ? `Missing: ${readiness.missing.join(", ")}`
                : "Telephony settings are ready for controlled launch."}
            </p>
          </Panel>

          <Panel>
            <h3 className="text-base font-semibold">Add contact</h3>
            <form className="mt-4 space-y-3" onSubmit={createContact}>
              <input
                className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                placeholder="Contact name"
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
              />
              <input
                className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                placeholder="+15551234567"
                value={contactPhone}
                onChange={(event) => setContactPhone(event.target.value)}
              />
              <Button type="submit">Create contact</Button>
            </form>
          </Panel>

          <Panel>
            <h3 className="text-base font-semibold">Create campaign</h3>
            <form className="mt-4 space-y-3" onSubmit={createCampaign}>
              <input
                className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                placeholder="Campaign name"
                value={campaignName}
                onChange={(event) => setCampaignName(event.target.value)}
              />
              <select
                className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                value={selectedAgentId}
                onChange={(event) => setSelectedAgentId(event.target.value)}
              >
                <option value="">Select agent</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
              <div className="space-y-2">
                {contacts.map((contact) => (
                  <label key={contact.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedContactIds.includes(contact.id)}
                      onChange={() => toggleContact(contact.id)}
                    />
                    {contact.name} · {contact.phoneNumber}
                  </label>
                ))}
              </div>
              <Button type="submit" disabled={contacts.length === 0 || agents.length === 0}>
                Create campaign
              </Button>
            </form>
          </Panel>
        </div>

        <Panel>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Campaigns</h3>
            <Badge>{loading ? "loading" : `${campaigns.length} total`}</Badge>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={complianceAck}
              onChange={(event) => setComplianceAck(event.target.checked)}
            />
            I confirm this audience has consent and complies with calling rules.
          </label>
          <div className="mt-4 divide-y divide-slate-100">
            {campaigns.length === 0 ? <p className="py-4 text-sm text-slate-500">No campaigns yet.</p> : null}
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="grid gap-3 py-4 md:grid-cols-[1fr_auto]">
                <div>
                  <div className="font-semibold">{campaign.name}</div>
                  <div className="text-sm text-slate-500">
                    {campaign.contactIds.length} contacts · {campaign.schedule}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={campaign.status === "launched" ? "success" : "neutral"}>{campaign.status}</Badge>
                  <Button
                    type="button"
                    disabled={!isCampaignLaunchable(campaign)}
                    onClick={() => void launchCampaign(campaign)}
                  >
                    Launch
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
