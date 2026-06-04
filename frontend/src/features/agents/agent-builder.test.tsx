import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AgentBuilderWorkspace } from "./agent-builder-workspace";
import type { AgentService } from "@/services/agent-service";

function createService(overrides: Partial<AgentService> = {}): AgentService {
  return {
    listAgents: vi.fn().mockResolvedValue([
      {
        id: "agent-1",
        name: "Reception Agent",
        status: "ready",
        provider: "openai",
        model: "gpt-4o-mini",
      },
    ]),
    getAgent: vi.fn().mockResolvedValue({
      name: "Reception Agent",
      welcomeMessage: "Hello from BixingAI.",
      systemPrompt: "Route callers to the right team.",
      provider: "openai",
      model: "gpt-4o-mini",
      voiceProvider: "elevenlabs",
      transcriberProvider: "deepgram",
    }),
    createAgent: vi.fn().mockResolvedValue({ id: "agent-2" }),
    updateAgent: vi.fn().mockResolvedValue(undefined),
    deleteAgent: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("AgentBuilderWorkspace", () => {
  it("loads and displays existing agents", async () => {
    render(<AgentBuilderWorkspace service={createService()} />);

    expect(await screen.findByText("Reception Agent")).toBeInTheDocument();
    expect(screen.getByText("gpt-4o-mini")).toBeInTheDocument();
  });

  it("submits a valid create form", async () => {
    const user = userEvent.setup();
    const service = createService({ listAgents: vi.fn().mockResolvedValue([]) });
    render(<AgentBuilderWorkspace service={service} />);

    await user.type(screen.getByLabelText("Agent name"), "Sales Agent");
    await user.type(screen.getByLabelText("Welcome message"), "Thanks for calling.");
    await user.type(screen.getByLabelText("System prompt"), "Qualify the caller.");
    await user.click(screen.getByRole("button", { name: "Create agent" }));

    await waitFor(() => {
      expect(service.createAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Sales Agent",
          welcomeMessage: "Thanks for calling.",
          systemPrompt: "Qualify the caller.",
        }),
      );
    });
  });

  it("loads an agent for edit and saves updates", async () => {
    const user = userEvent.setup();
    const service = createService();
    render(<AgentBuilderWorkspace service={service} />);

    await user.click(await screen.findByRole("button", { name: "Edit Reception Agent" }));
    await user.clear(screen.getByLabelText("Agent name"));
    await user.type(screen.getByLabelText("Agent name"), "Reception Agent v2");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(service.updateAgent).toHaveBeenCalledWith(
        "agent-1",
        expect.objectContaining({ name: "Reception Agent v2" }),
      );
    });
  });

  it("requires confirmation before deleting an agent", async () => {
    const user = userEvent.setup();
    const service = createService();
    render(<AgentBuilderWorkspace service={service} />);

    await user.click(await screen.findByRole("button", { name: "Delete Reception Agent" }));
    expect(service.deleteAgent).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Confirm delete Reception Agent" }));

    await waitFor(() => {
      expect(service.deleteAgent).toHaveBeenCalledWith("agent-1");
    });
  });

  it("shows readable service errors", async () => {
    render(<AgentBuilderWorkspace service={createService({ listAgents: vi.fn().mockRejectedValue(new Error("Backend unavailable")) })} />);

    expect(await screen.findByText("Backend unavailable")).toBeInTheDocument();
  });
});
