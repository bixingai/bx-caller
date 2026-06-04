import type { AgentDraft, AgentSummary, BolnaCreateAgentPayload } from "@/types/agent";

type UnknownRecord = Record<string, unknown>;

const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function firstTask(agentConfig: unknown): UnknownRecord {
  const tasks = asRecord(agentConfig).tasks;
  return Array.isArray(tasks) ? asRecord(tasks[0]) : {};
}

function firstTaskTools(agentConfig: unknown): UnknownRecord {
  return asRecord(firstTask(agentConfig).tools_config);
}

function llmConfig(agentConfig: unknown): UnknownRecord {
  return asRecord(asRecord(firstTaskTools(agentConfig).llm_agent).llm_config);
}

export function agentDraftToBolnaPayload(draft: AgentDraft): BolnaCreateAgentPayload {
  const transcriberProvider = draft.transcriberProvider || "deepgram";
  const voiceProvider = draft.voiceProvider || "elevenlabs";

  return {
    agent_config: {
      agent_name: draft.name,
      agent_type: "other",
      agent_welcome_message: draft.welcomeMessage,
      tasks: [
        {
          task_type: "conversation",
          toolchain: {
            execution: "parallel",
            pipelines: [["transcriber", "llm", "synthesizer"]],
          },
          tools_config: {
            input: { format: "wav", provider: "twilio" },
            output: { format: "wav", provider: "twilio" },
            transcriber: {
              encoding: "linear16",
              language: "en",
              provider: transcriberProvider,
              model: "nova-2",
              stream: true,
            },
            llm_agent: {
              agent_type: "simple_llm_agent",
              agent_flow_type: "streaming",
              llm_config: {
                provider: draft.provider,
                model: draft.model,
                request_json: false,
                temperature: 0.3,
              },
            },
            synthesizer: {
              audio_format: "wav",
              provider: voiceProvider,
              stream: true,
              provider_config: {
                voice: "George",
                model: "eleven_turbo_v2_5",
                voice_id: DEFAULT_VOICE_ID,
              },
              buffer_size: 100,
            },
          },
          task_config: {
            hangup_after_silence: 30,
          },
        },
      ],
    },
    agent_prompts: {
      task_1: {
        system_prompt: draft.systemPrompt,
      },
    },
  };
}

export function bolnaAgentToDraft(
  agentConfig: unknown,
  agentPrompts: unknown = {},
): AgentDraft {
  const config = asRecord(agentConfig);
  const tools = firstTaskTools(agentConfig);
  const transcriber = asRecord(tools.transcriber);
  const synthesizer = asRecord(tools.synthesizer);
  const prompts = asRecord(asRecord(agentPrompts).task_1);

  return {
    name: asString(config.agent_name, "Untitled Agent"),
    welcomeMessage: asString(config.agent_welcome_message, ""),
    systemPrompt: asString(prompts.system_prompt, ""),
    provider: asString(llmConfig(agentConfig).provider, "openai"),
    model: asString(llmConfig(agentConfig).model, "gpt-4o-mini"),
    voiceProvider: asString(synthesizer.provider, "elevenlabs"),
    transcriberProvider: asString(transcriber.provider, "deepgram"),
  };
}

export function bolnaAgentToSummary(id: string, agentConfig: unknown): AgentSummary {
  const config = asRecord(agentConfig);
  const statusValue = asString(config.assistant_status, "unknown");
  const status: AgentSummary["status"] =
    statusValue === "seeding" || statusValue === "updated" ? "ready" : "unknown";

  return {
    id,
    name: asString(config.agent_name, "Untitled Agent"),
    status,
    provider: asString(llmConfig(agentConfig).provider, "unknown"),
    model: asString(llmConfig(agentConfig).model, "unknown"),
  };
}
