import { apiFetch } from "@/lib/api-client";
import {
  agentDraftToBolnaPayload,
  bolnaAgentToDraft,
  bolnaAgentToSummary,
} from "@/services/agent-payload";
import type { AgentDraft, AgentSummary } from "@/types/agent";

type Fetcher = <T>(path: string, options?: RequestInit) => Promise<T>;

interface BackendAgentListResponse {
  agents: Array<{
    agent_id: string;
    data: unknown;
  }>;
}

interface AgentMutationResponse {
  agent_id: string;
  state: string;
}

interface BackendAgentDraftResponse {
  agent_config: unknown;
  agent_prompts?: unknown;
}

export interface AgentService {
  listAgents(): Promise<AgentSummary[]>;
  getAgent(id: string): Promise<AgentDraft>;
  createAgent(draft: AgentDraft): Promise<{ id: string }>;
  updateAgent(id: string, draft: AgentDraft): Promise<void>;
  deleteAgent(id: string): Promise<void>;
}

export function createAgentService(fetcher: Fetcher = apiFetch): AgentService {
  return {
    async listAgents() {
      const response = await fetcher<BackendAgentListResponse>("/agents");
      return response.agents.map((agent) => bolnaAgentToSummary(agent.agent_id, agent.data));
    },
    async getAgent(id: string) {
      const response = await fetcher<BackendAgentDraftResponse>(`/agent/${id}?include_prompts=true`);
      return bolnaAgentToDraft(response.agent_config, response.agent_prompts);
    },
    async createAgent(draft: AgentDraft) {
      const response = await fetcher<AgentMutationResponse>("/agent", {
        method: "POST",
        body: JSON.stringify(agentDraftToBolnaPayload(draft)),
      });
      return { id: response.agent_id };
    },
    async updateAgent(id: string, draft: AgentDraft) {
      await fetcher<AgentMutationResponse>(`/agent/${id}`, {
        method: "PUT",
        body: JSON.stringify(agentDraftToBolnaPayload(draft)),
      });
    },
    async deleteAgent(id: string) {
      await fetcher<AgentMutationResponse>(`/agent/${id}`, {
        method: "DELETE",
      });
    },
  };
}
