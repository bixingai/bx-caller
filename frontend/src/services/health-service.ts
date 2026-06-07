import { ApiError, apiFetch } from "@/lib/api-client";
import type { BackendHealth, HealthService } from "@/types/health";

type Fetcher = <T>(path: string, options?: RequestInit) => Promise<T>;

function failuresFromPayload(payload: unknown): Record<string, string> | null {
  if (!payload || typeof payload !== "object" || !("detail" in payload)) {
    return null;
  }
  const detail = (payload as { detail?: unknown }).detail;
  if (!detail || typeof detail !== "object" || !("failures" in detail)) {
    return null;
  }
  const failures = (detail as { failures?: unknown }).failures;
  if (!failures || typeof failures !== "object") {
    return null;
  }
  return failures as Record<string, string>;
}

export function createHealthService(fetcher: Fetcher = apiFetch): HealthService {
  return {
    getHealth() {
      return fetcher<{ status: string }>("/health");
    },
    async getReadiness(): Promise<BackendHealth> {
      try {
        const ready = await fetcher<{ status: string; checks?: string[] }>("/health/ready");
        return { state: "connected", checks: ready.checks ?? [] };
      } catch (error) {
        if (error instanceof ApiError || (error && typeof error === "object" && "status" in error)) {
          const apiError = error as ApiError;
          const failures = failuresFromPayload(apiError.payload);
          if (apiError.status === 503 && failures) {
            return { state: "degraded", failures };
          }
          return { state: "unavailable", message: apiError.message || "Backend unavailable" };
        }
        return { state: "unavailable", message: "Backend unavailable" };
      }
    },
  };
}

