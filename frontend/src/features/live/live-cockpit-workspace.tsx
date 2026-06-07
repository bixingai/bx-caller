"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { createLaunchService } from "@/services/launch-service";
import type { CallSession } from "@/types/launch";

const launchService = createLaunchService();

function sessionTone(status: string): "neutral" | "success" | "warning" | "danger" {
  if (status === "completed") {
    return "success";
  }
  if (status === "failed" || status === "busy" || status === "no-answer") {
    return "danger";
  }
  if (status === "queued" || status === "ringing") {
    return "warning";
  }
  return "neutral";
}

export function LiveCockpitWorkspace() {
  const [sessions, setSessions] = useState<CallSession[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void launchService
      .listCallSessions()
      .then(setSessions)
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Unable to load calls"));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Live Support Cockpit</h2>
        <p className="text-sm text-slate-500">Recent outbound call sessions from campaign launches.</p>
      </div>
      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      <div className="grid gap-4 xl:grid-cols-2">
        {sessions.length === 0 ? <Panel><p className="text-sm text-slate-500">No call sessions yet.</p></Panel> : null}
        {sessions.map((session) => (
          <Panel key={session.id}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{session.contactName}</h3>
              <Badge tone={sessionTone(session.status)}>{session.status}</Badge>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-slate-500">To</dt>
                <dd className="font-medium">{session.toNumber}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Provider</dt>
                <dd className="font-medium">{session.provider}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Provider call</dt>
                <dd className="font-medium">{session.providerCallId}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Created</dt>
                <dd className="font-medium">{new Date(session.createdAt).toLocaleString()}</dd>
              </div>
            </dl>
          </Panel>
        ))}
      </div>
    </div>
  );
}
