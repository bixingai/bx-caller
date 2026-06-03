import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { AppShell } from "@/components/app-shell";
import { CampaignControlWorkspace } from "@/features/campaigns/campaign-control-workspace";

describe("AppShell", () => {
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
});

describe("CampaignControlWorkspace", () => {
  it("keeps campaign launch mock-only and non-destructive", async () => {
    render(<CampaignControlWorkspace />);

    expect(await screen.findByText("Spring Renewal Outreach")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /launch/i })[0]).toBeDisabled();
    expect(screen.getByText(/no calls will be dialed/i)).toBeInTheDocument();
  });
});
