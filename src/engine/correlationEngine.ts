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
  EvidenceDetail,
  CandidateClassification,
  IncidentStatus,
  LifecycleTransition,
  SharedPartnerAccess,
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
    sourcesStatus: DataSourceStatus,
    existingIncidents: Incident[] = []
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

      const services = Array.from(new Set(clusterAlerts.map((a) => a.service))).sort();
      const primaryOrg = clusterAlerts[0].organization_id;

      // Check if this cluster matches an existing incident for Delayed Evidence Reconciliation
      const existingMatch = existingIncidents.find((oldInc) =>
        oldInc.services.some((s) => services.includes(s))
      );

      const incId = existingMatch ? existingMatch.incident_id : `INC-${String(incCounter).padStart(3, '0')}`;
      if (!existingMatch) incCounter++;

      // Extract symptoms & contributing failures
      const symptoms: string[] = [];
      const contributingFailures: string[] = [];

      clusterAlerts.forEach((a) => {
        if (a.alert_type === 'RESOURCE_EXHAUSTION' || a.is_root_cause_indicator) {
          contributingFailures.push(`${a.service}: ${a.message}`);
        } else {
          symptoms.push(`${a.service}: ${a.message}`);
        }
      });

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

      // Evaluate candidate root causes with 3-tier classification
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
        services,
        existingMatch !== undefined
      );

      // Provenance Detailed Evidence List
      const detailedEvidence: EvidenceDetail[] = [];
      clusterAlerts.forEach((a) => {
        detailedEvidence.push({
          id: a.alert_id,
          type: 'ALERT',
          source: a.source,
          timestamp: a.timestamp,
          service: a.service,
          organization: a.organization_id,
          description: a.message,
          correlation_reason: `Triggered ${a.severity} metric alarm (${a.metric} = ${a.value}) exceeding threshold ${a.threshold}`,
          weight_contribution: a.severity === 'CRITICAL' ? 0.35 : 0.20,
        });
      });

      activeLogs
        .filter((l) => services.includes(l.service))
        .forEach((l) => {
          detailedEvidence.push({
            id: l.log_id,
            type: 'LOG',
            source: l.host,
            timestamp: l.timestamp,
            service: l.service,
            organization: l.organization_id,
            description: l.message,
            correlation_reason: `Logged ${l.level} severity message coinciding with incident failure cascade`,
            weight_contribution: 0.15,
          });
        });

      activeTraces
        .filter((t) => services.includes(t.service))
        .forEach((t) => {
          detailedEvidence.push({
            id: t.trace_id,
            type: 'TRACE',
            source: t.service,
            timestamp: t.timestamp,
            service: t.service,
            organization: t.organization_id,
            description: `${t.operation} (${t.duration_ms}ms) -> ${t.status}`,
            correlation_reason: `Distributed span propagation between ${t.parent_service} and ${t.downstream_service}`,
            weight_contribution: 0.18,
          });
        });

      const activeEdges = this.topology.edges.filter(
        (e) => services.includes(e.source_service) && services.includes(e.target_service)
      );

      // Downstream blast radius and reverse path
      const blastRadiusPath = this.topology.getDownstreamBlastRadius(leadCandidate);
      const reverseSymptomPath =
        services.length > 1
          ? this.topology.getReverseUpstreamPath(services[services.length - 1], leadCandidate)
          : [leadCandidate];

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
        detailed_evidence: detailedEvidence,
        scores: {
          confidence_score: confidenceScore,
          confidence_label: confidenceLabel,
          active_weights: { ...this.scoring.config },
        },
        timestamps: {
          created_at: existingMatch ? existingMatch.created_at : new Date().toISOString(),
          earliest_alert: clusterAlerts[0].timestamp,
          latest_alert: clusterAlerts[clusterAlerts.length - 1].timestamp,
          last_reconciled_at: existingMatch ? new Date().toISOString() : undefined,
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

      // Lifecycle status logic
      let incStatus: IncidentStatus = 'CORRELATED';
      let lifecycleHistory: LifecycleTransition[] = [
        {
          timestamp: clusterAlerts[0].timestamp,
          from_status: 'NEW',
          to_status: 'CORRELATED',
          actor: 'CorrelationEngine (Automated)',
          actor_role: 'ADMIN',
          note: `Agglomerative affinity clustering grouped ${clusterAlerts.length} alarms.`,
        },
      ];

      if (existingMatch) {
        incStatus = existingMatch.status;
        lifecycleHistory = [...existingMatch.lifecycle_history];
        lifecycleHistory.push({
          timestamp: new Date().toISOString(),
          from_status: existingMatch.status,
          to_status: existingMatch.status,
          actor: 'ReconciliationService',
          actor_role: 'ADMIN',
          note: `Delayed telemetry reconciled: updated ${detailedEvidence.length} evidence anchors without recreating incident.`,
        });
      }

      incidents.push({
        incident_id: incId,
        title: `${leadCandidate} degradation impacting ${services.length} services`,
        severity: incSeverity,
        status: incStatus,
        organization_id: primaryOrg,
        services,
        alert_count: clusterAlerts.length,
        alerts: clusterAlerts,
        symptoms,
        contributing_failures: contributingFailures,
        probable_root_cause: existingMatch?.human_confirmed_root_cause || leadCandidate,
        probable_root_cause_candidates: candidates,
        confidence_score: confidenceScore,
        confidence_label: confidenceLabel,
        correlation_explanation: explanation,
        linked_traces: linkedTraces,
        linked_logs: linkedLogs,
        data_sources_status: sourcesStatus,
        provenance,
        assigned_to: existingMatch?.assigned_to || 'Unassigned (SRE On-Call Pool)',
        incident_commander: existingMatch?.incident_commander || 'Alex Rivera (SRE Lead)',
        created_at: existingMatch ? existingMatch.created_at : clusterAlerts[0].timestamp,
        updated_at: new Date().toISOString(),
        resolved_at: existingMatch?.resolved_at,
        lifecycle_history: lifecycleHistory,
        human_confirmed_root_cause: existingMatch?.human_confirmed_root_cause,
        human_confirmation_notes: existingMatch?.human_confirmation_notes,
        human_confirmed_by: existingMatch?.human_confirmed_by,
        human_confirmed_at: existingMatch?.human_confirmed_at,
        shared_with: existingMatch?.shared_with || [],
        blast_radius_path: blastRadiusPath,
        reverse_symptom_path: reverseSymptomPath,
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
    const firstTimestampMap = new Map<string, string>();
    services.forEach((s) => earliestPerService.set(s, 9999999999.0));

    alerts.forEach((a) => {
      if (earliestPerService.has(a.service)) {
        const t = this.scoring.parseTime(a.timestamp);
        if (t < earliestPerService.get(a.service)!) {
          earliestPerService.set(a.service, t);
          firstTimestampMap.set(a.service, a.timestamp);
        }
      }
    });

    clusterTimeline.forEach((evt) => {
      if (earliestPerService.has(evt.service)) {
        const t = this.scoring.parseTime(evt.timestamp);
        if (t < earliestPerService.get(evt.service)!) {
          earliestPerService.set(evt.service, t);
          firstTimestampMap.set(evt.service, evt.timestamp);
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

      const supportingAlerts = alerts.filter((a) => a.service === s).map((a) => a.alert_id);
      const supportingLogs = clusterLogs.filter((l) => l.service === s).map((l) => l.log_id);
      const supportingTraces = traces.filter((t) => t.service === s).map((t) => t.trace_id);
      const supportingTimeline = clusterTimeline.filter((evt) => evt.service === s).map((e) => e.description);

      const downstreamServices = this.topology.getDownstreamBlastRadius(s);
      const dependencyPath = this.topology.findShortestPath(s, services[services.length - 1]);

      const evidenceNotes: string[] = [];
      if (delta === 0) {
        evidenceNotes.push('Earliest recorded fault trigger in incident cluster (T0 anchor)');
      } else {
        evidenceNotes.push(`Symptom registered +${Math.round(delta)}s after initial cascade origin`);
      }

      if (hasRootIndicator) {
        evidenceNotes.push('Initiated critical resource exhaustion / saturation alarm');
      }
      if (hasFatalLog) {
        evidenceNotes.push('Triggered FATAL/ERROR log lines indicating unrecoverable state');
      }
      evidenceNotes.push(`Impacts ${downstreamServices.length} downstream consumer services`);

      // 3-tier classification: PROBABLE_ROOT_CAUSE, CONTRIBUTING_FAILURE, SYMPTOM
      let classification: CandidateClassification = 'SYMPTOM';
      if (totalRcScore >= 0.85 || isEarliestInCluster) {
        classification = 'PROBABLE_ROOT_CAUSE';
      } else if (totalRcScore >= 0.55 || hasRootIndicator || hasFatalLog) {
        classification = 'CONTRIBUTING_FAILURE';
      }

      const confLevel = totalRcScore >= 0.8 ? 'HIGH' : totalRcScore >= 0.5 ? 'MEDIUM' : 'LOW';
      const confLabel =
        confLevel === 'HIGH'
          ? 'HIGH CONFIDENCE CANDIDATE'
          : confLevel === 'MEDIUM'
          ? 'MEDIUM CONFIDENCE CANDIDATE'
          : 'LOW CONFIDENCE CANDIDATE';

      candidates.push({
        candidate: s,
        score: Math.round(totalRcScore * 1000) / 1000,
        confidence_level: confLevel,
        confidence_label: confLabel,
        classification,
        evidence_notes: evidenceNotes,
        evidence_count: supportingAlerts.length + supportingLogs.length + supportingTraces.length,
        first_observed_timestamp: firstTimestampMap.get(s) || alerts[0].timestamp,
        downstream_affected_count: downstreamServices.length,
        downstream_services: downstreamServices,
        dependency_path: dependencyPath,
        time_delta_sec: Math.round(delta),
        supporting_alerts: supportingAlerts,
        supporting_logs: supportingLogs,
        supporting_traces: supportingTraces,
        supporting_timeline_events: supportingTimeline,
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
    services: string[],
    isReconciled: boolean = false
  ): string {
    const sourcesStr = Object.entries(sources)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(', ');

    const missing = Object.entries(sources)
      .filter(([, v]) => !v)
      .map(([k]) => k);

    const missingNote =
      missing.length > 0
        ? ` Warning: ${missing.join(', ')} currently delayed/missing. Correlation dynamically relies on ${sourcesStr}.`
        : '';

    const reconcileNote = isReconciled
      ? ' [Reconciliation Active: Delayed telemetry incorporated into existing incident ID without disruption]'
      : '';

    return (
      `Incident ${incId} was grouped from ${alerts.length} alerts across ${services.length} services ` +
      `(${services.join(', ')}) using temporal adjacency (180s window) and topology cascade traversal. ` +
      `Evidence sources: ${sourcesStr}.${missingNote}${reconcileNote} ` +
      `'${rootCause}' is evaluated as the leading candidate root cause because initiating indicators ` +
      `preceded downstream consumer timeouts and error rates.`
    );
  }
}
