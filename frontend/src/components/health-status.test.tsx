import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HealthStatus } from "./health-status";

describe("HealthStatus", () => {
  it("shows connected backend readiness", async () => {
    render(
      <HealthStatus
        service={{
          getHealth: vi.fn().mockResolvedValue({ status: "ok" }),
          getReadiness: vi.fn().mockResolvedValue({ state: "connected", checks: ["redis"] }),
        }}
      />,
    );

    expect(await screen.findByText("Backend connected")).toBeInTheDocument();
    expect(screen.getByText("redis")).toBeInTheDocument();
  });
});
