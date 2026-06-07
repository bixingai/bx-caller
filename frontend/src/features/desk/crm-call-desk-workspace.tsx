"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { createLaunchService } from "@/services/launch-service";
import type { CallSession, Contact } from "@/types/launch";

const launchService = createLaunchService();

export function CrmCallDeskWorkspace() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [sessions, setSessions] = useState<CallSession[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void Promise.all([launchService.listContacts(), launchService.listCallSessions()])
      .then(([nextContacts, nextSessions]) => {
        setContacts(nextContacts);
        setSessions(nextSessions);
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Unable to load CRM data"));
  }, []);

  function latestSession(contactId: string) {
    return sessions
      .filter((session) => session.contactId === contactId)
      .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))[0];
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">CRM Call Desk</h2>
        <p className="text-sm text-slate-500">Persisted customer context and latest AI call outcomes.</p>
      </div>
      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      <Panel>
        <div className="divide-y divide-slate-100">
          {contacts.length === 0 ? <p className="py-4 text-sm text-slate-500">No contacts yet.</p> : null}
          {contacts.map((contact) => {
            const session = latestSession(contact.id);
            return (
              <div key={contact.id} className="grid gap-3 py-4 md:grid-cols-[1fr_1fr_auto]">
                <div>
                  <div className="font-semibold">{contact.name}</div>
                  <div className="text-sm text-slate-500">{contact.company || contact.phoneNumber}</div>
                </div>
                <div className="text-sm">
                  <div>{session ? `Last call ${session.status}` : "No calls yet"}</div>
                  <div className="text-slate-500">{contact.notes || "No follow-up notes"}</div>
                </div>
                <Badge>{session ? session.provider : "New"}</Badge>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
