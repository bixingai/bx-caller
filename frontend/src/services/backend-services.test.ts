import { describe, expect, it, vi } from "vitest";

import { createAgentService } from "./agent-service";
import { createHealthService } from "./health-service";

describe("backend service adapters", () => {
  it("maps readiness 503 failures to degraded health", async () => {
    const fetcher = vi.fn().mockRejectedValue({
      status: 503,
      payload: {
        detail: {
          failures: {
            redis: "ConnectionError: refused",
          },
        },
      },
    });

    const health = await createHealthService(fetcher).getReadiness();

    expect(health).toEqual({
      state: "degraded",
      failures: {
        redis: "ConnectionError: refused",
      },
    });
  });

  it("lists agents from the backend response", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      agents: [
        {
          agent_id: "agent-1",
          data: {
            agent_name: "Reception Agent",
            assistant_status: "updated",
            tasks: [
              {
                tools_config: {
                  llm_agent: {
                    llm_config: {
                      provider: "openai",
                      model: "gpt-4o-mini",
                    },
                  },
                },
              },
            ],
          },
        },
      ],
    });

    await expect(createAgentService(fetcher).listAgents()).resolves.toEqual([
      {
        id: "agent-1",
        name: "Reception Agent",
        status: "ready",
        provider: "openai",
        model: "gpt-4o-mini",
      },
    ]);
  });

  it("loads an editable draft with persisted prompts", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      agent_config: {
        agent_name: "Retention Agent",
        agent_welcome_message: "Thanks for speaking with us.",
        tasks: [
          {
            tools_config: {
              transcriber: { provider: "deepgram" },
              synthesizer: { provider: "elevenlabs" },
              llm_agent: {
                llm_config: {
                  provider: "openai",
                  model: "gpt-4o-mini",
                },
              },
            },
          },
        ],
      },
      agent_prompts: {
        task_1: {
          system_prompt: "Recover churn risk and schedule the next action.",
        },
      },
    });

    await expect(createAgentService(fetcher).getAgent("agent-1")).resolves.toMatchObject({
      name: "Retention Agent",
      systemPrompt: "Recover churn risk and schedule the next action.",
    });
    expect(fetcher).toHaveBeenCalledWith("/agent/agent-1?include_prompts=true");
  });
});
