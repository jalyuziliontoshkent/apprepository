type Context = Record<string, unknown>;

export const initMonitoring = () => {
  // Placeholder hook point for Sentry/Bugsnag integration.
};

export const captureException = (error: unknown, context?: Context) => {
  if (__DEV__) {
    console.error('[monitoring]', error, context || {});
  }
};
