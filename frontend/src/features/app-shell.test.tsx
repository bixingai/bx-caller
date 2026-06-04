import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "@/components/app-shell";
import { CampaignControlWorkspace } from "@/features/campaigns/campaign-control-workspace";

describe("AppShell", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("renders all five workspace nav items", () => {
    render(
      <AppShell activeWorkspaceId="agents" showHealth={false}>
        <div>Agent Builder Studio</div>
      </AppShell>,
    );

    for (const label of ["Executive", "Agents", "Campaigns", "Live", "Desk"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  it("switches local persona defaults to the matching workspace", async () => {
    const user = userEvent.setup();
    render(
      <AppShell activeWorkspaceId="agents" showHealth={false}>
        <div>Agent Builder Studio</div>
      </AppShell>,
    );

    await user.selectOptions(screen.getByLabelText("Local persona"), "marketing-manager");

    expect(screen.getByText("Default workspace: Campaigns")).toBeInTheDocument();
  });

  it("toggles and persists the color theme", async () => {
    const user = userEvent.setup();
    render(
      <AppShell activeWorkspaceId="agents" showHealth={false}>
        <div>Agent Builder Studio</div>
      </AppShell>,
    );

    await user.click(screen.getByRole("button", { name: "Switch to dark theme" }));

    expect(screen.getByRole("button", { name: "Switch to light theme" })).toBeInTheDocument();
    expect(window.localStorage.getItem("bx-caller-theme")).toBe("dark");
  });
});

describe("CampaignControlWorkspace", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps launch disabled until provider readiness is satisfied", async () => {
    const jsonResponse = (payload: unknown) =>
      Promise.resolve(
        new Response(JSON.stringify(payload), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }),
      );
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const path = input.toString();
      if (path === "/api/contacts") {
        return jsonResponse({
          contacts: [
            {
              id: "contact-1",
              name: "Maya Chen",
              phone_number: "+15551234567",
              email: "",
              company: "Northwind",
              tags: ["renewal"],
              notes: "",
              created_at: "2026-06-03T12:00:00Z",
              updated_at: "2026-06-03T12:00:00Z",
            },
          ],
        });
      }
      if (path === "/api/campaigns") {
        return jsonResponse({
          campaigns: [
            {
              id: "campaign-1",
              name: "June Renewal Outreach",
              agent_id: "agent-1",
              contact_ids: ["contact-1"],
              script: "AI renewal and follow-up call",
              schedule: "immediate",
              status: "draft",
              created_at: "2026-06-03T12:00:00Z",
              updated_at: "2026-06-03T12:00:00Z",
              launched_at: null,
            },
          ],
        });
      }
      if (path === "/api/agents") {
        return jsonResponse({
          agents: [
            {
              agent_id: "agent-1",
              data: {
                agent_name: "Retention Agent",
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
      }
      if (path === "/api/provider-readiness") {
        return jsonResponse({
          provider: "twilio",
          ready: false,
          missing: ["TWILIO_AUTH_TOKEN"],
        });
      }
      return Promise.resolve(new Response("Not found", { status: 404 }));
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<CampaignControlWorkspace />);

    expect(await screen.findByText("June Renewal Outreach")).toBeInTheDocument();
    expect(screen.getByText("needs setup")).toBeInTheDocument();
    expect(screen.getByText(/TWILIO_AUTH_TOKEN/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /launch/i })[0]).toBeDisabled();
    expect(screen.getByText(/I confirm this audience has consent/i)).toBeInTheDocument();
  });
});
