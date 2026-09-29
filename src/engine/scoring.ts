import { RawAlert, DataSourceStatus, CorrelationConfig } from '../types';

export const DEFAULT_CONFIG: CorrelationConfig = {
  time_weight: 0.25,
  service_weight: 0.20,
  topology_weight: 0.20,
  trace_weight: 0.15,
  log_weight: 0.10,
  severity_weight: 0.10,
  time_window_sec: 180.0,
  affinity_threshold: 0.48,
};

export class CorrelationScoring {
  config: CorrelationConfig;

  constructor(customConfig?: Partial<CorrelationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...customConfig };
  }

  parseTime(ts: string): number {
    return new Date(ts).getTime() / 1000.0;
  }

  computeTimeProximity(ts1: string, ts2: string): number {
    const delta = Math.abs(this.parseTime(ts1) - this.parseTime(ts2));
    if (delta >= this.config.time_window_sec) return 0.0;
    return Math.max(0.0, 1.0 - delta / this.config.time_window_sec);
  }

  computeSeverityScore(sev1: string, sev2: string): number {
    const s1 = sev1.toUpperCase();
    const s2 = sev2.toUpperCase();
    if (s1 === 'CRITICAL' && s2 === 'CRITICAL') return 1.0;
    if ((s1 === 'CRITICAL' && s2 === 'HIGH') || (s1 === 'HIGH' && s2 === 'CRITICAL')) return 0.75;
    if (s1 === 'HIGH' && s2 === 'HIGH') return 0.60;
    if (s1 === 'HIGH' || s2 === 'HIGH' || s1 === 'MEDIUM' || s2 === 'MEDIUM') return 0.35;
    return 0.15;
  }

  computePairwiseAffinity(
    alertA: RawAlert,
    alertB: RawAlert,
    topologyDistance: number,
    sharedTrace: boolean,
    logMatch: boolean,
    sourcesAvailable: DataSourceStatus
  ): {
    total_score: number;
    sub_scores: Record<string, number>;
    active_weights: Record<string, number>;
  } {
    const timeScore = this.computeTimeProximity(alertA.timestamp, alertB.timestamp);
    const serviceScore = alertA.service === alertB.service ? 1.0 : 0.0;

    let topoScore = 0.0;
    if (topologyDistance === 0) topoScore = 1.0;
    else if (topologyDistance === 1) topoScore = 0.85;
    else if (topologyDistance === 2) topoScore = 0.50;
    else topoScore = 0.0;

    const traceScore = sharedTrace ? 1.0 : 0.0;
    const logScore = logMatch ? 1.0 : 0.0;
    const sevScore = this.computeSeverityScore(alertA.severity, alertB.severity);

    // Dynamic weight rebalancing based on source availability
    const weights: Record<string, number> = {
      time: this.config.time_weight,
      service: this.config.service_weight,
      topology: sourcesAvailable.topology ? this.config.topology_weight : 0.0,
      trace: sourcesAvailable.traces ? this.config.trace_weight : 0.0,
      log: sourcesAvailable.logs ? this.config.log_weight : 0.0,
      severity: this.config.severity_weight,
    };

    const sumWeights = Object.values(weights).reduce((a, b) => a + b, 0) || 1.0;
    const normWeights: Record<string, number> = {};
    for (const [k, v] of Object.entries(weights)) {
      normWeights[k] = v / sumWeights;
    }

    const totalScore =
      normWeights.time * timeScore +
      normWeights.service * serviceScore +
      normWeights.topology * topoScore +
      normWeights.trace * traceScore +
      normWeights.log * logScore +
      normWeights.severity * sevScore;

    return {
      total_score: Math.round(totalScore * 10000) / 10000,
      sub_scores: {
        time_score: Math.round(timeScore * 1000) / 1000,
        service_score: Math.round(serviceScore * 1000) / 1000,
        topology_score: Math.round(topoScore * 1000) / 1000,
        trace_score: Math.round(traceScore * 1000) / 1000,
        log_score: Math.round(logScore * 1000) / 1000,
        severity_score: Math.round(sevScore * 1000) / 1000,
      },
      active_weights: normWeights,
    };
  }
}
