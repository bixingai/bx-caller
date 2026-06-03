import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { getMockContacts } from "@/services/mock-services";

export async function CrmCallDeskWorkspace() {
  const contacts = await getMockContacts();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">CRM Call Desk</h2>
        <p className="text-sm text-slate-500">Mock customer context and follow-up workflows.</p>
      </div>
      <Panel>
        <div className="divide-y divide-slate-100">
          {contacts.map((contact) => (
            <div key={contact.id} className="grid gap-3 py-4 md:grid-cols-[1fr_1fr_auto]">
              <div>
                <div className="font-semibold">{contact.name}</div>
                <div className="text-sm text-slate-500">{contact.company}</div>
              </div>
              <div className="text-sm">
                <div>{contact.lastOutcome}</div>
                <div className="text-slate-500">{contact.nextAction}</div>
              </div>
              <Badge>Review</Badge>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

