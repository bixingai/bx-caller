"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Metric, Panel } from "@/components/ui/panel";
import { createLaunchService } from "@/services/launch-service";
import type { AuditLog, CallSession, Campaign, Contact } from "@/types/launch";

const launchService = createLaunchService();

export function ExecutiveWorkspace() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [sessions, setSessions] = useState<CallSession[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void Promise.all([
      launchService.listContacts(),
      launchService.listCampaigns(),
      launchService.listCallSessions(),
      launchService.listAuditLogs(),
    ])
      .then(([nextContacts, nextCampaigns, nextSessions, nextAuditLogs]) => {
        setContacts(nextContacts);
        setCampaigns(nextCampaigns);
        setSessions(nextSessions);
        setAuditLogs(nextAuditLogs);
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Unable to load metrics"));
  }, []);

  const launchedCampaigns = campaigns.filter((campaign) => campaign.status === "launched").length;
  const queuedSessions = sessions.filter((session) => session.status === "queued").length;
  const completedSessions = sessions.filter((session) => session.status === "completed").length;
  const completionRate = useMemo(() => {
    if (sessions.length === 0) {
      return "0%";
    }
    return `${Math.round((completedSessions / sessions.length) * 100)}%`;
  }, [completedSessions, sessions.length]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Executive Command Center</h2>
          <p className="text-sm text-slate-500">Operational launch metrics from real bx-caller records.</p>
        </div>
        <Badge tone={error ? "danger" : "success"}>{error ? "needs attention" : "Backend monitored"}</Badge>
      </div>
      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Contacts" value={String(contacts.length)} detail="Launch audience" />
        <Metric label="Campaigns launched" value={String(launchedCampaigns)} detail={`${campaigns.length} total`} />
        <Metric label="Queued calls" value={String(queuedSessions)} detail={`${sessions.length} sessions`} />
        <Metric label="Completion rate" value={completionRate} detail="From call records" />
      </div>
      <Panel>
        <h3 className="text-base font-semibold">Audit trail</h3>
        <div className="mt-4 space-y-3 text-sm">
          {auditLogs.length === 0 ? <p className="text-slate-500">No launch activity yet.</p> : null}
          {auditLogs.slice(-5).reverse().map((log) => (
            <div key={log.id} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0">
              <span>{log.event}</span>
              <Badge>{new Date(log.createdAt).toLocaleString()}</Badge>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
