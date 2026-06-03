import { describe, expect, it } from "vitest";

import {
  agentDraftToBolnaPayload,
  bolnaAgentToDraft,
  bolnaAgentToSummary,
} from "./agent-payload";
import type { AgentDraft } from "@/types/agent";

describe("agent payload mapping", () => {
  it("maps an AgentDraft to a Bolna-compatible create payload", () => {
    const draft: AgentDraft = {
      name: "Reception Agent",
      welcomeMessage: "Hello, this is BixingAI.",
      systemPrompt: "Qualify the caller and route urgent issues.",
      provider: "openai",
      model: "gpt-4o-mini",
      voiceProvider: "elevenlabs",
      transcriberProvider: "deepgram",
    };

    const payload = agentDraftToBolnaPayload(draft);

    expect(payload.agent_config.agent_name).toBe("Reception Agent");
    expect(payload.agent_config.agent_welcome_message).toBe("Hello, this is BixingAI.");
    expect(payload.agent_prompts.task_1.system_prompt).toBe(
      "Qualify the caller and route urgent issues.",
    );
    expect(payload.agent_config.tasks).toHaveLength(1);
    expect(payload.agent_config.tasks[0].task_type).toBe("conversation");
    expect(payload.agent_config.tasks[0].tools_config.llm_agent.llm_config.provider).toBe("openai");
    expect(payload.agent_config.tasks[0].tools_config.llm_agent.llm_config.model).toBe("gpt-4o-mini");
    expect(payload.agent_config.tasks[0].tools_config.transcriber.provider).toBe("deepgram");
    expect(payload.agent_config.tasks[0].tools_config.synthesizer.provider).toBe("elevenlabs");
  });

  it("maps a backend Bolna payload to the narrow AgentDraft model", () => {
    const payload = agentDraftToBolnaPayload({
      name: "Collections Agent",
      welcomeMessage: "Hi, thanks for taking the call.",
      systemPrompt: "Collect payment intent and schedule follow-up.",
      provider: "openai",
      model: "gpt-4o-mini",
      voiceProvider: "elevenlabs",
      transcriberProvider: "deepgram",
    });

    expect(bolnaAgentToDraft(payload.agent_config, payload.agent_prompts)).toEqual({
      name: "Collections Agent",
      welcomeMessage: "Hi, thanks for taking the call.",
      systemPrompt: "Collect payment intent and schedule follow-up.",
      provider: "openai",
      model: "gpt-4o-mini",
      voiceProvider: "elevenlabs",
      transcriberProvider: "deepgram",
    });
  });

  it("summarizes incomplete backend agents with unknown provider and model", () => {
    const summary = bolnaAgentToSummary("agent-1", {
      agent_name: "Legacy Agent",
      tasks: [],
    });

    expect(summary).toEqual({
      id: "agent-1",
      name: "Legacy Agent",
      status: "unknown",
      provider: "unknown",
      model: "unknown",
    });
  });
});
