import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { getMockLiveCalls } from "@/services/mock-services";

export async function LiveCockpitWorkspace() {
  const calls = await getMockLiveCalls();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Live Support Cockpit</h2>
        <p className="text-sm text-slate-500">Mock active-call supervision and handoff queue.</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {calls.map((call) => (
          <Panel key={call.id}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{call.caller}</h3>
              <Badge tone={call.sentiment === "at-risk" ? "danger" : "neutral"}>{call.sentiment}</Badge>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {call.agentName} · {call.elapsed}
            </p>
            <div className="mt-4 space-y-2 text-sm">
              {call.transcript.map((line) => (
                <p key={line} className="rounded-md bg-slate-50 p-2">
                  {line}
                </p>
              ))}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

