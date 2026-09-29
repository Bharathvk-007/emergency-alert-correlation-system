/**
 * Types and interfaces for Emergency Alert Correlation System
 */

export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type AlertType =
  | 'RESOURCE_EXHAUSTION'
  | 'LATENCY'
  | 'ERROR_RATE'
  | 'STATE_CHANGE'
  | 'METRIC_ANOMALY'
  | 'USER_IMPACT';

export type UserRole =
  | 'ADMIN'
  | 'ENGINEER'
  | 'INCIDENT_COMMANDER'
  | 'PARTNER'
  | 'VIEWER';

export type OrganizationId = 'ORG-A' | 'ORG-B' | 'ORG-C';

export interface Organization {
  id: OrganizationId;
  name: string;
  type: string;
  description: string;
  services: string[];
}

export interface RawAlert {
  alert_id: string;
  timestamp: string;
  organization_id: OrganizationId;
  service: string;
  host: string;
  severity: SeverityLevel;
  alert_type: AlertType;
  metric: string;
  value: number;
  threshold: number;
  message: string;
  source: string;
  ground_truth_incident_id?: string;
  is_root_cause_indicator?: boolean;
}

export interface LogRecord {
  log_id: string;
  timestamp: string;
  organization_id: OrganizationId;
  service: string;
  host: string;
  level: 'FATAL' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  message: string;
  trace_id: string;
  request_id: string;
  ground_truth_incident_id?: string;
}

export interface TraceSpan {
  trace_id: string;
  timestamp: string;
  organization_id: OrganizationId;
  service: string;
  operation: string;
  duration_ms: number;
  status: 'OK' | 'ERROR' | 'WARN' | 'TIMEOUT';
  parent_service: string;
  downstream_service: string;
  ground_truth_incident_id?: string;
}

export interface TopologyEdge {
  source_service: string;
  target_service: string;
  dependency_type: 'http' | 'database' | 'cache' | 'queue' | 'network' | 'external_api';
  criticality: 'critical' | 'high' | 'medium' | 'low';
}

export interface TimelineEvent {
  incident_id: string;
  timestamp: string;
  event_type: 'METRIC_ANOMALY' | 'STATE_CHANGE' | 'USER_IMPACT' | 'OPERATIONAL_ACTION';
  service: string;
  description: string;
  source: string;
  severity: SeverityLevel;
  ground_truth_root_cause?: string;
  organization_id: OrganizationId;
}

export interface RootCauseCandidate {
  candidate: string;
  score: number;
  confidence_level: 'HIGH' | 'MEDIUM' | 'LOW';
  evidence_notes: string[];
  time_delta_sec: number;
}

export interface ProvenanceRecord {
  incident_id: string;
  organization_id: OrganizationId;
  alert_ids: string[];
  trace_ids: string[];
  log_ids: string[];
  topology_edges: { source: string; target: string }[];
  timeline_events: TimelineEvent[];
  correlation_reasons: string[];
  root_cause_candidates: RootCauseCandidate[];
  scores: {
    confidence_score: number;
    confidence_label: string;
    active_weights: Record<string, number>;
  };
  timestamps: {
    created_at: string;
    earliest_alert: string;
    latest_alert: string;
  };
  data_sources_used: DataSourceStatus;
  lineage_tree: {
    root: string;
    alerts: string[];
    traces: string[];
    logs: string[];
    dependency_flow: string[];
  };
}

export interface Incident {
  incident_id: string;
  title: string;
  severity: SeverityLevel;
  status: 'ACTIVE' | 'INVESTIGATING' | 'MITIGATED' | 'RESOLVED';
  organization_id: OrganizationId;
  services: string[];
  alert_count: number;
  alerts: RawAlert[];
  symptoms: string[];
  probable_root_cause: string;
  probable_root_cause_candidates: RootCauseCandidate[];
  confidence_score: number;
  confidence_label: 'HIGH' | 'MEDIUM' | 'LOW';
  correlation_explanation: string;
  linked_traces: string[];
  linked_logs: string[];
  data_sources_status: DataSourceStatus;
  provenance: ProvenanceRecord;
}

export interface DataSourceStatus {
  alerts: boolean;
  logs: boolean;
  traces: boolean;
  topology: boolean;
  timeline: boolean;
}

export interface CorrelationConfig {
  time_weight: number;
  service_weight: number;
  topology_weight: number;
  trace_weight: number;
  log_weight: number;
  severity_weight: number;
  time_window_sec: number;
  affinity_threshold: number;
}

export interface EvaluationMetricComparison {
  name: string;
  baseline: string | number;
  target: string | number;
  prototype: string | number;
  status: 'MET' | 'EXCEEDED' | 'PENDING';
  explanation: string;
}

export interface AuditExportPayload {
  audit_version: string;
  export_timestamp: string;
  incident_id: string;
  organization_id: OrganizationId;
  title: string;
  status: string;
  system_version: string;
  observed_facts: {
    affected_services: string[];
    earliest_detected_event?: any;
    alert_evidence: any[];
    log_evidence: any[];
    trace_evidence: any[];
    active_topology_path: string[];
  };
  system_inferences: {
    correlation_summary: string;
    symptoms_identified: string[];
    probable_root_cause_candidates: RootCauseCandidate[];
    provenance_trace_link: string;
    overall_system_confidence: number;
  };
  telemetry_provenance_metadata: {
    data_sources_available: DataSourceStatus;
    applied_weights: Record<string, number>;
    evaluation_flags: Record<string, boolean>;
  };
}
