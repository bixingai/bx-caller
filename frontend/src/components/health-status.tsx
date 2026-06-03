"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { createHealthService } from "@/services/health-service";
import type { BackendHealth, HealthService } from "@/types/health";

const defaultService = createHealthService();

export function HealthStatus({ service = defaultService }: Readonly<{ service?: HealthService }>) {
  const [health, setHealth] = useState<BackendHealth>({ state: "unavailable", message: "Checking backend" });

  useEffect(() => {
    let mounted = true;
    void service.getReadiness().then((nextHealth) => {
      if (mounted) {
        setHealth(nextHealth);
      }
    });
    return () => {
      mounted = false;
    };
  }, [service]);

  if (health.state === "connected") {
    return (
      <div className="flex items-center gap-2">
        <Badge tone="success">Backend connected</Badge>
        <span className="text-xs text-slate-500">{health.checks.join(", ") || "ready"}</span>
      </div>
    );
  }

  if (health.state === "degraded") {
    return <Badge tone="warning">Backend degraded</Badge>;
  }

  return <Badge tone="danger">Backend unavailable</Badge>;
}

