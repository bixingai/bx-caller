import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiFetch } from "./api-client";

describe("apiFetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("includes browser credentials on requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/health");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/health",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("targets the bx-caller API when the frontend is path-mounted", async () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/bx-caller");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/health");

    expect(fetchMock).toHaveBeenCalledWith(
      "/bx-caller/api/health",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("throws an ApiError for non-2xx JSON errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "Not authenticated" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(apiFetch("/agents")).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      message: "Not authenticated",
    } satisfies Partial<ApiError>);
  });
});
