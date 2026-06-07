import { describe, expect, it } from "vitest";

import { createMockCampaignService } from "./mock-services";
import { defaultWorkspaceForRole } from "./workspaces";

describe("workspace role routing", () => {
  it.each([
    ["ceo", "/executive"],
    ["operations-manager", "/agents"],
    ["marketing-manager", "/campaigns"],
    ["supervisor", "/live"],
    ["support-rep", "/desk"],
  ] as const)("routes %s to %s", (role, route) => {
    expect(defaultWorkspaceForRole(role).href).toBe(route);
  });
});

describe("mock campaign service", () => {
  it("never launches real dialing", async () => {
    const result = await createMockCampaignService().launchCampaign("campaign-1");

    expect(result).toEqual({
      kind: "mock-only",
      message: "Campaign launch is scaffolded; no calls were dialed.",
    });
  });
});
