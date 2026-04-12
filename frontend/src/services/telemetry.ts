type Telemetry = {
  requests: number;
  failures: number;
  avgLatencyMs: number;
};

let requests = 0;
let failures = 0;
let totalLatencyMs = 0;

export const trackApiSuccess = (latencyMs: number) => {
  requests += 1;
  totalLatencyMs += latencyMs;
};

export const trackApiFailure = (latencyMs: number) => {
  requests += 1;
  failures += 1;
  totalLatencyMs += latencyMs;
};

export const getApiMetrics = (): Telemetry => ({
  requests,
  failures,
  avgLatencyMs: requests > 0 ? Math.round(totalLatencyMs / requests) : 0,
});
