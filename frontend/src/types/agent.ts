export interface AgentDraft {
  name: string;
  welcomeMessage: string;
  systemPrompt: string;
  provider: string;
  model: string;
  voiceProvider?: string;
  transcriberProvider?: string;
}

export interface AgentSummary {
  id: string;
  name: string;
  status: "draft" | "ready" | "error" | "unknown";
  provider: string;
  model: string;
  updatedAt?: string;
}

export interface BolnaCreateAgentPayload {
  agent_config: {
    agent_name: string;
    agent_type: string;
    tasks: BolnaTask[];
    agent_welcome_message: string;
    assistant_status?: string;
  };
  agent_prompts: {
    task_1: {
      system_prompt: string;
    };
  };
}

export interface BolnaTask {
  task_type: "conversation";
  toolchain: {
    execution: "parallel" | "sequential";
    pipelines: string[][];
  };
  tools_config: {
    input: {
      format: string;
      provider: string;
    };
    output: {
      format: string;
      provider: string;
    };
    transcriber: {
      encoding: string;
      language: string;
      provider: string;
      model: string;
      stream: boolean;
    };
    llm_agent: {
      agent_type: "simple_llm_agent";
      agent_flow_type: "streaming";
      llm_config: {
        provider: string;
        model: string;
        request_json: boolean;
        temperature: number;
      };
    };
    synthesizer: {
      audio_format: string;
      provider: string;
      stream: boolean;
      provider_config: {
        voice: string;
        model: string;
        voice_id: string;
      };
      buffer_size: number;
    };
  };
  task_config: {
    hangup_after_silence: number;
  };
}

