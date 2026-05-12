import { useQuery } from '@tanstack/react-query';
import { HealthResponseSchema } from '@handrix/contracts';
import type { HealthResponse } from '@handrix/contracts';

async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error('Health check failed');
  return HealthResponseSchema.parse(await res.json());
}

export function HealthCheck() {
  const { data, isError, isLoading } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    retry: false,
  });

  if (isLoading) return <span>Checking API…</span>;
  if (isError || data?.status !== 'ok') return <span>API unreachable</span>;
  return <span>API connected</span>;
}
