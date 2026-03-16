import { get } from '../client';
import type { HealthResponse } from '../../types/api';

const PATH = '/api/health';

export async function fetchHealth(): Promise<HealthResponse> {
  return get<HealthResponse>(PATH);
}
