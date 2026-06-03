export type BackendHealth =
  | { state: "connected"; checks: string[] }
  | { state: "degraded"; failures: Record<string, string> }
  | { state: "unavailable"; message: string };

export interface HealthService {
  getHealth(): Promise<{ status: string }>;
  getReadiness(): Promise<BackendHealth>;
}

