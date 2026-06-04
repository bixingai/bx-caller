"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { AgentForm } from "@/features/agents/agent-form";
import { createAgentService, type AgentService } from "@/services/agent-service";
import type { AgentDraft, AgentSummary } from "@/types/agent";

const defaultService = createAgentService();

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Agent operation failed";
}

export function AgentBuilderWorkspace({ service = defaultService }: Readonly<{ service?: AgentService }>) {
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<AgentDraft | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAgents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setAgents(await service.listAgents());
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [service]);

  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

  async function createAgent(draft: AgentDraft) {
    await service.createAgent(draft);
    await loadAgents();
  }

  async function startEdit(agent: AgentSummary) {
    setError("");
    setEditingId(agent.id);
    setEditingDraft(await service.getAgent(agent.id));
  }

  async function updateAgent(draft: AgentDraft) {
    if (!editingId) {
      return;
    }
    await service.updateAgent(editingId, draft);
    setEditingId(null);
    setEditingDraft(null);
    await loadAgents();
  }

  async function deleteAgent(agent: AgentSummary) {
    await service.deleteAgent(agent.id);
    setConfirmDeleteId(null);
    await loadAgents();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Agent Builder Studio</h2>
          <p className="text-sm text-slate-500">Create and manage AI phone agents backed by bx-caller.</p>
        </div>
        <Button type="button" onClick={() => setEditingId(null)}>
          New agent
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel>
          <h3 className="text-base font-semibold">Agents</h3>
          {loading ? <p className="mt-4 text-sm text-slate-500">Loading agents...</p> : null}
          {!loading && agents.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No agents yet. Create the first AI caller.</p>
          ) : null}
          <div className="mt-4 divide-y divide-slate-100">
            {agents.map((agent) => (
              <div key={agent.id} className="grid gap-3 py-4 md:grid-cols-[1fr_auto]">
                <div>
                  <div className="font-semibold">{agent.name}</div>
                  <div className="text-sm text-slate-500">
                    <span>{agent.provider}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{agent.model}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    aria-label={`Edit ${agent.name}`}
                    onClick={() => void startEdit(agent)}
                  >
                    Edit
                  </Button>
                  {confirmDeleteId === agent.id ? (
                    <Button
                      type="button"
                      variant="danger"
                      aria-label={`Confirm delete ${agent.name}`}
                      onClick={() => void deleteAgent(agent)}
                    >
                      Confirm delete
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      aria-label={`Delete ${agent.name}`}
                      onClick={() => setConfirmDeleteId(agent.id)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <h3 className="text-base font-semibold">{editingId ? "Edit agent" : "Create agent"}</h3>
          <p className="mb-4 mt-1 text-sm text-slate-500">
            MVP supports a single conversation task with OpenAI, Deepgram, and ElevenLabs defaults.
          </p>
          {editingId && !editingDraft ? (
            <p className="text-sm text-slate-500">Loading agent...</p>
          ) : (
            <AgentForm
              key={editingId ?? "create"}
              mode={editingId ? "edit" : "create"}
              initialDraft={editingDraft ?? undefined}
              onSubmit={editingId ? updateAgent : createAgent}
            />
          )}
        </Panel>
      </div>
    </div>
  );
}
