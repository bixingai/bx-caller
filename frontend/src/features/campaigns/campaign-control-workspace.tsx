"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { createMockCampaignService } from "@/services/mock-services";
import type { CampaignMock } from "@/types/workspace";

export function CampaignControlWorkspace() {
  const [campaigns, setCampaigns] = useState<CampaignMock[]>([]);

  useEffect(() => {
    void createMockCampaignService().listCampaigns().then(setCampaigns);
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Outbound Campaign Control</h2>
        <p className="text-sm text-slate-500">Campaign planning scaffold. No calls will be dialed in MVP.</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {campaigns.map((campaign) => (
          <Panel key={campaign.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold">{campaign.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{campaign.audience}</p>
              </div>
              <Badge tone={campaign.compliance === "ready" ? "success" : "warning"}>
                {campaign.compliance}
              </Badge>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-slate-500">Agent</dt>
                <dd className="font-medium">{campaign.agentName}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Projected conversion</dt>
                <dd className="font-medium">{campaign.conversionRate}%</dd>
              </div>
            </dl>
            <div className="mt-5 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Mock-only scaffold
              </span>
              <Button disabled>Launch campaign</Button>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

