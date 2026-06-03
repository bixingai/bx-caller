import { Badge } from "@/components/ui/badge";
import { Metric, Panel } from "@/components/ui/panel";

export function ExecutiveWorkspace() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Executive Command Center</h2>
          <p className="text-sm text-slate-500">Business health and risk signals across AI operations.</p>
        </div>
        <Badge tone="success">Backend monitored</Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Live calls" value="42" detail="Across 6 agents" />
        <Metric label="Resolution rate" value="73%" detail="+4.2% this week" />
        <Metric label="Escalation rate" value="9%" detail="Within target" />
        <Metric label="Avg latency" value="420ms" detail="Realtime path" />
      </div>
      <Panel>
        <h3 className="text-base font-semibold">Risk queue</h3>
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span>Retention campaign has elevated escalation rate</span>
            <Badge tone="warning">Review</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Reception Agent meets containment target</span>
            <Badge tone="success">Healthy</Badge>
          </div>
        </div>
      </Panel>
    </div>
  );
}

