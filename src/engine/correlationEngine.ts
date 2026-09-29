import {
  RawAlert,
  LogRecord,
  TraceSpan,
  TimelineEvent,
  TopologyEdge,
  Incident,
  RootCauseCandidate,
  DataSourceStatus,
  ProvenanceRecord,
  CorrelationConfig,
} from '../types';
import { CorrelationScoring, DEFAULT_CONFIG } from './scoring';
import { TopologyGraph } from './topology';

export class CorrelationEngine {
  scoring: CorrelationScoring;
  topology: TopologyGraph;
  affinityThreshold: number;

  constructor(
    topologyEdges: TopologyEdge[] = [],
    config?: Partial<CorrelationConfig>
  ) {
    this.scoring = new CorrelationScoring(config);
    this.topology = new TopologyGraph(topologyEdges);
    this.affinityThreshold = config?.affinity_threshold ?? DEFAULT_CONFIG.affinity_threshold;
  }

  correlate(
    alerts: RawAlert[],
    logs: LogRecord[],
    traces: TraceSpan[],
    timelineEvents: TimelineEvent[],
    sourcesStatus: DataSourceStatus
  ): Incident[] {
    const activeLogs = sourcesStatus.logs ? logs : [];
    const activeTraces = sourcesStatus.traces ? traces : [];
    const activeTimeline = sourcesStatus.timeline ? timelineEvents : [];

    // Map traces to services
    const traceToServices = new Map<string, Set<string>>();
    activeTraces.forEach((t) => {
      if (!traceToServices.has(t.trace_id)) {
        traceToServices.set(t.trace_id, new Set());
      }
      traceToServices.get(t.trace_id)!.add(t.service);
    });

    // Pairwise agglomerative graph clustering
    const n = alerts.length;
    const clusters: number[][] = [];
    const visited = new Set<number>();

    for (let i = 0; i < n; i++) {
      if (visited.has(i)) continue;
      const currentCluster = [i];
      visited.add(i);

      for (let j = i + 1; j < n; j++) {
        if (visited.has(j)) continue;
        const a1 = alerts[i];
        const a2 = alerts[j];

        // Check shared trace
        let sharedTrace = false;
        for (const [, sSet] of traceToServices.entries()) {
          if (sSet.has(a1.service) && sSet.has(a2.service)) {
            sharedTrace = true;
            break;
          }
        }

        // Check log match
        let logMatch = false;
        if (activeLogs.length > 0) {
          const l1 = activeLogs.some((l) => l.service === a1.service);
          const l2 = activeLogs.some((l) => l.service === a2.service);
          if (l1 && l2) logMatch = true;
        }

        // Topological distance
        const topoDist = sourcesStatus.topology
          ? this.topology.shortestDistance(a1.service, a2.service)
          : 999;

        const affinity = this.scoring.computePairwiseAffinity(
          a1,
          a2,
          topoDist,
          sharedTrace,
          logMatch,
          sourcesStatus
        );

        if (affinity.total_score >= this.affinityThreshold) {
          currentCluster.push(j);
          visited.add(j);
        }
      }

      clusters.push(currentCluster);
    }

    // Convert clusters to structured Incident objects
    const incidents: Incident[] = [];
    let incCounter = 1;

    for (const indices of clusters) {
      const clusterAlerts = indices.map((idx) => alerts[idx]);

      // Filter out isolated low-severity noise alerts from becoming major incidents
      if (clusterAlerts.length === 1 && (clusterAlerts[0].severity === 'LOW' || clusterAlerts[0].severity === 'INFO')) {
        continue;
      }

      const incId = `INC-${String(incCounter).padStart(3, '0')}`;
      incCounter++;

      const services = Array.from(new Set(clusterAlerts.map((a) => a.service))).sort();
      const primaryOrg = clusterAlerts[0].organization_id;

      // Extract symptoms
      const symptoms = clusterAlerts.map((a) => `${a.service}: ${a.message}`);

      // Linked traces
      const linkedTraces = Array.from(
        new Set(
          activeTraces
            .filter((t) => services.includes(t.service))
            .map((t) => t.trace_id)
        )
      ).sort();

      // Linked logs
      const linkedLogs = Array.from(
        new Set(
          activeLogs
            .filter((l) => services.includes(l.service))
            .map((l) => l.log_id)
        )
      ).sort();

      // Evaluate candidate root causes
      const candidates = this.evaluateRootCauseCandidates(
        services,
        clusterAlerts,
        activeLogs,
        activeTraces,
        activeTimeline
      );

      const leadCandidate = candidates.length > 0 ? candidates[0].candidate : services[0];
      const { score: confidenceScore, label: confidenceLabel } = this.determineConfidence(
        sourcesStatus,
        clusterAlerts
      );

      const explanation = this.buildExplanation(
        incId,
        clusterAlerts,
        leadCandidate,
        sourcesStatus,
        services
      );

      // Provenance structure
      const activeEdges = this.topology.edges.filter(
        (e) => services.includes(e.source_service) && services.includes(e.target_service)
      );

      const provenance: ProvenanceRecord = {
        incident_id: incId,
        organization_id: primaryOrg,
        alert_ids: clusterAlerts.map((a) => a.alert_id),
        trace_ids: linkedTraces,
        log_ids: linkedLogs,
        topology_edges: activeEdges.map((e) => ({
          source: e.source_service,
          target: e.target_service,
        })),
        timeline_events: activeTimeline.filter((evt) => services.includes(evt.service)),
        correlation_reasons: [
          `Temporal window cluster span: ${clusterAlerts[0].timestamp} to ${clusterAlerts[clusterAlerts.length - 1].timestamp}`,
          `Topological adjacency across services: ${services.join(', ')}`,
          `Active evidence telemetry sources: ${Object.entries(sourcesStatus)
            .filter(([, v]) => v)
            .map(([k]) => k)
            .join(', ')}`,
        ],
        root_cause_candidates: candidates,
        scores: {
          confidence_score: confidenceScore,
          confidence_label: confidenceLabel,
          active_weights: { ...this.scoring.config },
        },
        timestamps: {
          created_at: new Date().toISOString(),
          earliest_alert: clusterAlerts[0].timestamp,
          latest_alert: clusterAlerts[clusterAlerts.length - 1].timestamp,
        },
        data_sources_used: sourcesStatus,
        lineage_tree: {
          root: incId,
          alerts: clusterAlerts.map((a) => a.alert_id),
          traces: linkedTraces,
          logs: linkedLogs,
          dependency_flow: activeEdges.map(
            (e) => `${e.source_service} -> ${e.target_service}`
          ),
        },
      };

      const severities = clusterAlerts.map((a) => a.severity);
      const incSeverity = severities.includes('CRITICAL')
        ? 'CRITICAL'
        : severities.includes('HIGH')
        ? 'HIGH'
        : 'MEDIUM';

      incidents.push({
        incident_id: incId,
        title: `${leadCandidate} degradation impacting ${services.length} services`,
        severity: incSeverity,
        status: 'ACTIVE',
        organization_id: primaryOrg,
        services,
        alert_count: clusterAlerts.length,
        alerts: clusterAlerts,
        symptoms,
        probable_root_cause: leadCandidate,
        probable_root_cause_candidates: candidates,
        confidence_score: confidenceScore,
        confidence_label: confidenceLabel,
        correlation_explanation: explanation,
        linked_traces: linkedTraces,
        linked_logs: linkedLogs,
        data_sources_status: sourcesStatus,
        provenance,
      });
    }

    return incidents;
  }

  evaluateRootCauseCandidates(
    services: string[],
    alerts: RawAlert[],
    logs: LogRecord[],
    traces: TraceSpan[],
    timeline: TimelineEvent[]
  ): RootCauseCandidate[] {
    if (!services.length || !alerts.length) return [];

    const alertTimes = alerts.map((a) => this.scoring.parseTime(a.timestamp));
    const clusterStart = Math.min(...alertTimes) - 60.0;
    const clusterEnd = Math.max(...alertTimes) + 60.0;

    const clusterLogs = logs.filter(
      (l) =>
        services.includes(l.service) &&
        this.scoring.parseTime(l.timestamp) >= clusterStart &&
        this.scoring.parseTime(l.timestamp) <= clusterEnd
    );

    const clusterTimeline = timeline.filter(
      (evt) =>
        services.includes(evt.service) &&
        this.scoring.parseTime(evt.timestamp) >= clusterStart &&
        this.scoring.parseTime(evt.timestamp) <= clusterEnd
    );

    const earliestPerService = new Map<string, number>();
    services.forEach((s) => earliestPerService.set(s, 9999999999.0));

    alerts.forEach((a) => {
      if (earliestPerService.has(a.service)) {
        const t = this.scoring.parseTime(a.timestamp);
        if (t < earliestPerService.get(a.service)!) {
          earliestPerService.set(a.service, t);
        }
      }
    });

    clusterTimeline.forEach((evt) => {
      if (earliestPerService.has(evt.service)) {
        const t = this.scoring.parseTime(evt.timestamp);
        if (t < earliestPerService.get(evt.service)!) {
          earliestPerService.set(evt.service, t);
        }
      }
    });

    const minTime = Math.min(...Array.from(earliestPerService.values()));

    const candidates: RootCauseCandidate[] = [];

    for (const s of services) {
      const sTime = earliestPerService.get(s)!;
      const delta = Math.max(0.0, sTime - minTime);
      const timeScore = Math.max(0.1, 1.0 - delta / 45.0);

      const isEarliestInCluster = delta === 0.0;
      const originScore = isEarliestInCluster ? 0.95 : 0.40;

      const hasRootIndicator = alerts.some(
        (a) =>
          a.service === s &&
          (a.is_root_cause_indicator ||
            a.alert_type === 'RESOURCE_EXHAUSTION' ||
            a.alert_type === 'STATE_CHANGE')
      );
      const resourceScore = hasRootIndicator ? 1.0 : 0.4;

      const hasFatalLog = clusterLogs.some(
        (l) => l.service === s && (l.level === 'FATAL' || l.level === 'ERROR')
      );
      const logEvidenceScore = hasFatalLog ? 1.0 : 0.4;

      const totalRcScore =
        0.40 * timeScore +
        0.35 * originScore +
        0.15 * resourceScore +
        0.10 * logEvidenceScore;

      const evidenceNotes: string[] = [];
      if (delta === 0) {
        evidenceNotes.push('First observed anomaly timestamp in incident cluster');
      } else {
        evidenceNotes.push(`Anomaly observed +${Math.round(delta)}s after initial cluster trigger`);
      }

      if (hasRootIndicator) {
        evidenceNotes.push('Triggered critical root-cause indicator / RESOURCE_EXHAUSTION alarm');
      }
      if (hasFatalLog) {
        evidenceNotes.push('Associated FATAL/ERROR log lines detected in cluster window');
      }

      const confLevel = totalRcScore >= 0.8 ? 'HIGH' : totalRcScore >= 0.5 ? 'MEDIUM' : 'LOW';

      candidates.push({
        candidate: s,
        score: Math.round(totalRcScore * 1000) / 1000,
        confidence_level: confLevel,
        evidence_notes: evidenceNotes,
        time_delta_sec: Math.round(delta),
      });
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates;
  }

  determineConfidence(
    sources: DataSourceStatus,
    alerts: RawAlert[]
  ): { score: number; label: 'HIGH' | 'MEDIUM' | 'LOW' } {
    const activeCount = Object.values(sources).filter(Boolean).length;
    let base = 0.5 + activeCount * 0.1;
    if (alerts.length >= 3) base += 0.05;
    base = Math.min(0.98, base);

    let label: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    if (base >= 0.88) label = 'HIGH';
    else if (base >= 0.70) label = 'MEDIUM';

    return { score: Math.round(base * 100) / 100, label };
  }

  buildExplanation(
    incId: string,
    alerts: RawAlert[],
    rootCause: string,
    sources: DataSourceStatus,
    services: string[]
  ): string {
    const sourcesStr = Object.entries(sources)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(', ');

    const missing = Object.entries(sources)
      .filter(([, v]) => !v)
      .map(([k]) => k);

    const missingNote = missing.length > 0 ? ` (Warning: ${missing.join(', ')} offline/delayed)` : '';

    return (
      `Incident ${incId} was grouped from ${alerts.length} alerts across ${services.length} services ` +
      `(${services.join(', ')}) based on temporal proximity and topological dependency paths. ` +
      `Evidence sources utilized: ${sourcesStr}${missingNote}. ` +
      `'${rootCause}' is evaluated as the leading probable root-cause candidate due to initiating ` +
      `alarms preceding downstream symptom propagation.`
    );
  }
}
