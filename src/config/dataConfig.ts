
// Configuration for data fetching and staleness thresholds
export const DATA_CONFIG = {
  // Polling intervals
  LIVE_DATA_POLL_INTERVAL_MS: 10 * 1000, // 10 seconds - matches machine telemetry
  SIMPLE_DATA_POLL_INTERVAL_MS: 10 * 1000, // 10 seconds - matches machine telemetry
  
  // Staleness thresholds
  DATA_STALENESS_THRESHOLD_MS: 90 * 1000, // 90 seconds - mark as disconnected
  
  // Legacy threshold for compatibility
  LEGACY_STALENESS_THRESHOLD_MS: 15 * 60 * 1000, // 15 minutes
};
