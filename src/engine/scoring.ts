import { RawAlert, DataSourceStatus, CorrelationConfig } from '../types';
import { HISTORICAL_INCIDENTS } from '../data/syntheticDataset';

export const DEFAULT_CONFIG: CorrelationConfig = {
  time_weight: 0.22,
  service_weight: 0.18,
  topology_weight: 0.18,
  trace_weight: 0.14,
  log_weight: 0.10,
  metric_weight: 0.08,
  host_weight: 0.05,
  severity_weight: 0.05,
  time_window_sec: 180.0,
  affinity_threshold: 0.46,
};

export interface PairwiseCorrelationResult {
  total_score: number;
  sub_scores: Record<string, number>;
  active_weights: Record<string, number>;
  correlation_reasons: string[];
  evidence_summary: string;
}

export class CorrelationScoring {
  config: CorrelationConfig;

  constructor(customConfig?: Partial<CorrelationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...customConfig };
  }

  parseTime(ts: string): number {
    return new Date(ts).getTime() / 1000.0;
  }

  computeTimeProximity(ts1: string, ts2: string): { score: number; deltaSec: number } {
    const delta = Math.abs(this.parseTime(ts1) - this.parseTime(ts2));
    if (delta >= this.config.time_window_sec) {
      return { score: 0.0, deltaSec: Math.round(delta) };
    }
    const score = Math.max(0.0, 1.0 - delta / this.config.time_window_sec);
    return { score, deltaSec: Math.round(delta) };
  }

  computeMetricSimilarity(alertA: RawAlert, alertB: RawAlert): number {
    // Check metric type category match (e.g. latency vs latency, error_rate vs error_rate)
    if (alertA.alert_type === alertB.alert_type) {
      return 1.0;
    }
    // High correlation between RESOURCE_EXHAUSTION and LATENCY/ERROR_RATE
    if (
      (alertA.alert_type === 'RESOURCE_EXHAUSTION' && (alertB.alert_type === 'LATENCY' || alertB.alert_type === 'ERROR_RATE')) ||
      (alertB.alert_type === 'RESOURCE_EXHAUSTION' && (alertA.alert_type === 'LATENCY' || alertA.alert_type === 'ERROR_RATE'))
    ) {
      return 0.85;
    }
    if (
      (alertA.alert_type === 'LATENCY' && alertB.alert_type === 'ERROR_RATE') ||
      (alertB.alert_type === 'LATENCY' && alertA.alert_type === 'ERROR_RATE')
    ) {
      return 0.70;
    }
    return 0.20;
  }

  computeSharedHost(alertA: RawAlert, alertB: RawAlert): number {
    if (alertA.host && alertB.host && alertA.host === alertB.host) {
      return 1.0;
    }
    // Shared cluster prefix (e.g. eds-prod-app-01 and eds-prod-app-03)
    if (alertA.host && alertB.host) {
      const prefixA = alertA.host.split('-').slice(0, 2).join('-');
      const prefixB = alertB.host.split('-').slice(0, 2).join('-');
      if (prefixA === prefixB && prefixA.length > 2) {
        return 0.65;
      }
    }
    return 0.0;
  }

  computeSeverityScore(sev1: string, sev2: string): number {
    const s1 = (sev1 || '').toUpperCase();
    const s2 = (sev2 || '').toUpperCase();
    if (s1 === 'CRITICAL' && s2 === 'CRITICAL') return 1.0;
    if ((s1 === 'CRITICAL' && s2 === 'HIGH') || (s1 === 'HIGH' && s2 === 'CRITICAL')) return 0.80;
    if (s1 === 'HIGH' && s2 === 'HIGH') return 0.65;
    if (s1 === 'HIGH' || s2 === 'HIGH' || s1 === 'MEDIUM' || s2 === 'MEDIUM') return 0.40;
    return 0.15;
  }

  computeHistoricalSimilarity(serviceA: string, serviceB: string): number {
    for (const h of HISTORICAL_INCIDENTS) {
      if (
        (h.trigger_service === serviceA && h.cascade_services.includes(serviceB)) ||
        (h.trigger_service === serviceB && h.cascade_services.includes(serviceA)) ||
        (h.cascade_services.includes(serviceA) && h.cascade_services.includes(serviceB))
      ) {
        return h.similarity_weight;
      }
    }
    return 0.0;
  }

  computePairwiseAffinity(
    alertA: RawAlert,
    alertB: RawAlert,
    topologyDistance: number,
    sharedTrace: boolean,
    logMatch: boolean,
    sourcesAvailable: DataSourceStatus
  ): PairwiseCorrelationResult {
    const { score: timeScore, deltaSec } = this.computeTimeProximity(alertA.timestamp, alertB.timestamp);
    const serviceScore = alertA.service === alertB.service ? 1.0 : 0.0;

    let topoScore = 0.0;
    if (topologyDistance === 0) topoScore = 1.0;
    else if (topologyDistance === 1) topoScore = 0.88;
    else if (topologyDistance === 2) topoScore = 0.55;
    else topoScore = 0.0;

    const traceScore = sharedTrace ? 1.0 : 0.0;
    const logScore = logMatch ? 1.0 : 0.0;
    const metricScore = this.computeMetricSimilarity(alertA, alertB);
    const hostScore = this.computeSharedHost(alertA, alertB);
    const sevScore = this.computeSeverityScore(alertA.severity, alertB.severity);

    // Dynamic weight rebalancing based on source availability
    const weights: Record<string, number> = {
      time: this.config.time_weight,
      service: this.config.service_weight,
      topology: sourcesAvailable.topology ? this.config.topology_weight : 0.0,
      trace: sourcesAvailable.traces ? this.config.trace_weight : 0.0,
      log: sourcesAvailable.logs ? this.config.log_weight : 0.0,
      metric: this.config.metric_weight,
      host: this.config.host_weight,
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
      normWeights.metric * metricScore +
      normWeights.host * hostScore +
      normWeights.severity * sevScore;

    // Build human-readable correlation reasons
    const reasons: string[] = [];
    if (deltaSec <= 30) {
      reasons.push(`${deltaSec}s close temporal proximity`);
    } else if (deltaSec <= 180) {
      reasons.push(`${deltaSec}s temporal clustering window`);
    }

    if (serviceScore === 1.0) {
      reasons.push(`Same service (${alertA.service})`);
    } else if (topologyDistance === 1) {
      reasons.push(`Direct 1-hop topology dependency (${alertA.service} ↔ ${alertB.service})`);
    } else if (topologyDistance === 2) {
      reasons.push(`2-hop downstream topology path (${alertA.service} → ${alertB.service})`);
    }

    if (sharedTrace) {
      reasons.push('Linked distributed trace ID propagation');
    }
    if (logMatch) {
      reasons.push('Coinciding error log failure signatures');
    }
    if (metricScore >= 0.7) {
      reasons.push(`Causal metric synergy (${alertA.alert_type} ↔ ${alertB.alert_type})`);
    }
    if (hostScore >= 0.6) {
      reasons.push(`Shared cluster infrastructure (${alertA.host} / ${alertB.host})`);
    }

    const evidenceSummary = `${alertA.alert_id} + ${alertB.alert_id}: ${reasons.join(', ')}. Correlation Score: ${Math.round(totalScore * 100) / 100}`;

    return {
      total_score: Math.round(totalScore * 10000) / 10000,
      sub_scores: {
        time_score: Math.round(timeScore * 1000) / 1000,
        service_score: Math.round(serviceScore * 1000) / 1000,
        topology_score: Math.round(topoScore * 1000) / 1000,
        trace_score: Math.round(traceScore * 1000) / 1000,
        log_score: Math.round(logScore * 1000) / 1000,
        metric_score: Math.round(metricScore * 1000) / 1000,
        host_score: Math.round(hostScore * 1000) / 1000,
        severity_score: Math.round(sevScore * 1000) / 1000,
      },
      active_weights: normWeights,
      correlation_reasons: reasons,
      evidence_summary: evidenceSummary,
    };
  }
}
