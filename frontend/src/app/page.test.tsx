import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import Page from "./page";

describe("AI Call Center home", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the product shell entry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/api/health/ready")) {
          return new Response(JSON.stringify({ status: "ready", checks: ["redis"] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.endsWith("/api/agents")) {
          return new Response(JSON.stringify({ agents: [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ status: "ok" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );

    render(<Page />);

    expect(screen.getByRole("heading", { name: /ai call center/i })).toBeInTheDocument();
    expect(await screen.findByText("Backend connected")).toBeInTheDocument();
    expect(await screen.findByText("No agents yet. Create the first AI caller.")).toBeInTheDocument();
  });
});
