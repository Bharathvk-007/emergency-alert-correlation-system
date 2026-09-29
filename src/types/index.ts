/**
 * Types and interfaces for Emergency Alert Correlation System (70% Milestone)
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
  | 'SRE_ENGINEER'
  | 'ENGINEER' // alias for SRE_ENGINEER
  | 'INCIDENT_COMMANDER'
  | 'PARTNER_ENGINEER'
  | 'PARTNER' // alias for PARTNER_ENGINEER
  | 'VIEWER';

export type OrganizationId = 'ORG-A' | 'ORG-B' | 'ORG-C' | 'ORG-D';

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

export type CandidateClassification =
  | 'PROBABLE_ROOT_CAUSE'
  | 'CONTRIBUTING_FAILURE'
  | 'SYMPTOM';

export interface RootCauseCandidate {
  candidate: string;
  score: number;
  confidence_level: 'HIGH' | 'MEDIUM' | 'LOW';
  confidence_label: string; // e.g. "HIGH CONFIDENCE CANDIDATE"
  classification: CandidateClassification;
  evidence_notes: string[];
  evidence_count: number;
  first_observed_timestamp: string;
  downstream_affected_count: number;
  downstream_services: string[];
  dependency_path: string[];
  time_delta_sec: number;
  supporting_alerts: string[];
  supporting_logs: string[];
  supporting_traces: string[];
  supporting_timeline_events: string[];
}

export interface EvidenceDetail {
  id: string;
  type: 'ALERT' | 'LOG' | 'TRACE' | 'TOPOLOGY_EDGE' | 'TIMELINE_EVENT';
  source: string;
  timestamp: string;
  service: string;
  organization: OrganizationId;
  description: string;
  correlation_reason: string;
  weight_contribution: number;
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
  detailed_evidence: EvidenceDetail[];
  scores: {
    confidence_score: number;
    confidence_label: string;
    active_weights: Record<string, number>;
  };
  timestamps: {
    created_at: string;
    earliest_alert: string;
    latest_alert: string;
    last_reconciled_at?: string;
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

export type IncidentStatus =
  | 'NEW'
  | 'INVESTIGATING'
  | 'CORRELATED'
  | 'ROOT_CAUSE_CANDIDATE'
  | 'MITIGATED'
  | 'RESOLVED';

export interface LifecycleTransition {
  timestamp: string;
  from_status: IncidentStatus;
  to_status: IncidentStatus;
  actor: string;
  actor_role: UserRole;
  note?: string;
}

export interface SharedPartnerAccess {
  target_org: OrganizationId;
  shared_at: string;
  shared_by: string;
  permitted_services: string[];
  share_alerts: boolean;
  share_dependencies: boolean;
  share_logs: boolean; // default false (privacy)
  share_internal_hosts: boolean; // default false
}

export interface Incident {
  incident_id: string;
  title: string;
  severity: SeverityLevel;
  status: IncidentStatus;
  organization_id: OrganizationId;
  services: string[];
  alert_count: number;
  alerts: RawAlert[];
  symptoms: string[];
  contributing_failures: string[];
  probable_root_cause: string;
  probable_root_cause_candidates: RootCauseCandidate[];
  confidence_score: number;
  confidence_label: 'HIGH' | 'MEDIUM' | 'LOW';
  correlation_explanation: string;
  linked_traces: string[];
  linked_logs: string[];
  data_sources_status: DataSourceStatus;
  provenance: ProvenanceRecord;
  // Lifecycle & Human-in-the-Loop fields
  assigned_to: string;
  incident_commander: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  lifecycle_history: LifecycleTransition[];
  human_confirmed_root_cause?: string;
  human_confirmation_notes?: string;
  human_confirmed_by?: string;
  human_confirmed_at?: string;
  // Sharing & Permissions
  shared_with: SharedPartnerAccess[];
  // Blast Radius & Reverse Paths
  blast_radius_path: string[];
  reverse_symptom_path: string[];
}

export type SourceAvailabilityState = 'AVAILABLE' | 'DELAYED' | 'MISSING';

export interface DataSourceStatus {
  alerts: boolean;
  logs: boolean;
  traces: boolean;
  topology: boolean;
  timeline: boolean;
  // Granular availability state for Milestone 2
  alerts_state?: SourceAvailabilityState;
  logs_state?: SourceAvailabilityState;
  traces_state?: SourceAvailabilityState;
  topology_state?: SourceAvailabilityState;
  timeline_state?: SourceAvailabilityState;
  delay_seconds?: {
    logs?: number;
    traces?: number;
  };
}

export interface CorrelationConfig {
  time_weight: number;
  service_weight: number;
  topology_weight: number;
  trace_weight: number;
  log_weight: number;
  metric_weight: number;
  host_weight: number;
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
  status: IncidentStatus;
  system_version: string;
  assigned_to: string;
  incident_commander: string;
  human_confirmation?: {
    is_confirmed: boolean;
    confirmed_root_cause?: string;
    confirmed_by?: string;
    confirmed_at?: string;
    notes?: string;
  };
  observed_facts: {
    affected_services: string[];
    earliest_detected_event?: any;
    alert_evidence: any[];
    log_evidence: any[];
    trace_evidence: any[];
    active_topology_path: string[];
    downstream_blast_radius: string[];
  };
  system_inferences: {
    correlation_summary: string;
    symptoms_identified: string[];
    contributing_failures: string[];
    probable_root_cause_candidates: RootCauseCandidate[];
    provenance_trace_link: string;
    overall_system_confidence: number;
  };
  lifecycle_audit_trail: LifecycleTransition[];
  sharing_history: SharedPartnerAccess[];
  telemetry_provenance_metadata: {
    data_sources_available: DataSourceStatus;
    applied_weights: Record<string, number>;
    evaluation_flags: Record<string, boolean>;
  };
}

export interface SimulationState {
  isRunning: boolean;
  isPaused: boolean;
  speedMultiplier: number;
  currentStep: number;
  totalSteps: number;
  elapsedVirtualSec: number;
  processedAlertCount: number;
}

export interface StakeholderQuestionnaireResponse {
  role: 'SRE_ENGINEER' | 'INCIDENT_COMMANDER' | 'PLATFORM_ENGINEER' | 'PARTNER';
  respondent_name: string;
  organization: OrganizationId;
  submitted_at: string;
  q1_grouping_clarity: number; // 1-5
  q2_reason_identifiable: boolean;
  q3_traceability_score: number; // 1-5
  q4_dependency_graph_utility: number; // 1-5
  q5_missing_data_clarity: number; // 1-5
  q6_effort_reduction_pct: number; // percentage
  q7_confusing_parts: string;
  q8_suggested_improvements: string;
  is_synthetic_demo: boolean;
}
