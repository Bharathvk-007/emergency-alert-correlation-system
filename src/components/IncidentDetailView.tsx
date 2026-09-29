import React, { useState } from 'react';
import {
  Incident,
  LogRecord,
  TraceSpan,
  TimelineEvent,
  UserRole,
  OrganizationId,
  IncidentStatus,
  EvidenceDetail,
} from '../types';
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  Network,
  GitBranch,
  FileText,
  Activity,
  Shield,
  Layers,
  CheckCircle2,
  AlertOctagon,
  Download,
  Share2,
  Check,
  UserCheck,
  Edit3,
  Flame,
  Info,
} from 'lucide-react';

interface IncidentDetailViewProps {
  incident: Incident;
  allLogs: LogRecord[];
  allTraces: TraceSpan[];
  allTimeline: TimelineEvent[];
  userRole: UserRole;
  currentOrg: OrganizationId;
  onBack: () => void;
  onExportAudit: (incident: Incident) => void;
  onNavigateToTopology: () => void;
  onOpenShare: (incident: Incident) => void;
  onUpdateStatus: (incidentId: string, status: IncidentStatus) => void;
  onConfirmRootCause: (incidentId: string, candidate: string, notes: string) => void;
  onAssignEngineer: (incidentId: string, assignee: string) => void;
}

export const IncidentDetailView: React.FC<IncidentDetailViewProps> = ({
  incident,
  allLogs,
  allTraces,
  allTimeline,
  userRole,
  currentOrg,
  onBack,
  onExportAudit,
  onNavigateToTopology,
  onOpenShare,
  onUpdateStatus,
  onConfirmRootCause,
  onAssignEngineer,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'alerts' | 'traces' | 'logs' | 'provenance' | 'lifecycle'>('overview');
  const [selectedEvidenceItem, setSelectedEvidenceItem] = useState<EvidenceDetail | null>(null);

  // Human in the loop confirmation state
  const [confirmingCandidate, setConfirmingCandidate] = useState<string>(incident.probable_root_cause);
  const [humanNotes, setHumanNotes] = useState<string>(incident.human_confirmation_notes || '');
  const [assigneeInput, setAssigneeInput] = useState<string>(incident.assigned_to);

  // Filter logs, traces, and timeline
  const incidentLogs = allLogs.filter(
    (l) => incident.services.includes(l.service) && incident.linked_logs.includes(l.log_id)
  );
  const incidentTraces = allTraces.filter(
    (t) => incident.services.includes(t.service) && incident.linked_traces.includes(t.trace_id)
  );
  const incidentTimeline = allTimeline
    .filter((e) => incident.services.includes(e.service))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const earliestEvent = incidentTimeline[0];

  const handleSaveConfirmation = () => {
    onConfirmRootCause(incident.incident_id, confirmingCandidate, humanNotes);
  };

  const handleSaveAssignee = () => {
    onAssignEngineer(incident.incident_id, assigneeInput);
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Incidents</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenShare(incident)}
            className="flex items-center gap-1.5 text-xs font-semibold text-sky-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share with Partner</span>
          </button>

          <button
            onClick={() => onExportAudit(incident)}
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 px-3.5 py-1.5 rounded-lg shadow transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Audit Explanation</span>
          </button>
        </div>
      </div>

      {/* HEADER: Incident ID, Severity, Status, Organization, Assigned Engineer */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-base font-extrabold px-3 py-1 rounded bg-slate-800 text-sky-400 border border-slate-700">
              {incident.incident_id}
            </span>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded ${
                incident.severity === 'CRITICAL'
                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                  : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}
            >
              {incident.severity}
            </span>

            {/* Lifecycle Status Selector */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded border border-slate-800 text-xs">
              <span className="text-[11px] font-mono text-slate-400">Lifecycle State:</span>
              <select
                value={incident.status}
                onChange={(e) => onUpdateStatus(incident.incident_id, e.target.value as IncidentStatus)}
                className="bg-slate-900 border border-slate-700 text-xs rounded px-2 py-0.5 text-sky-300 font-bold focus:outline-none"
              >
                <option value="NEW">NEW</option>
                <option value="INVESTIGATING">INVESTIGATING</option>
                <option value="CORRELATED">CORRELATED</option>
                <option value="ROOT_CAUSE_CANDIDATE">ROOT_CAUSE_CANDIDATE</option>
                <option value="MITIGATED">MITIGATED</option>
                <option value="RESOLVED">RESOLVED</option>
              </select>
            </div>

            <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
              Tenant: {incident.organization_id}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block font-mono">
                System Confidence
              </span>
              <span
                className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded inline-block ${
                  incident.confidence_label === 'HIGH'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : incident.confidence_label === 'MEDIUM'
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                }`}
              >
                {incident.confidence_label} ({Math.round(incident.confidence_score * 100)}%)
              </span>
            </div>
          </div>
        </div>

        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            {incident.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
            <span>Assigned SRE: <strong className="text-slate-200">{incident.assigned_to}</strong></span>
            <span>Incident Commander: <strong className="text-slate-200">{incident.incident_commander}</strong></span>
            <span>Created At: <strong className="text-slate-200">{incident.created_at}</strong></span>
          </div>
        </div>

        {/* SECTION 8: Correlation Explanation */}
        <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800/80 text-xs text-slate-300 leading-relaxed font-sans">
          <strong className="text-sky-400 font-mono">System Correlation Explanation: </strong>
          {incident.correlation_explanation}
        </div>

        {/* SECTION 7: Data Availability & Uncertainty Notice */}
        <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300 font-mono">Evidence Stream State:</span>
            <span className="font-mono text-emerald-400">Alerts: AVAILABLE</span>
            <span className={`font-mono ${incident.data_sources_status.logs ? 'text-emerald-400' : 'text-rose-400'}`}>
              Logs: {incident.data_sources_status.logs ? 'AVAILABLE' : 'MISSING'}
            </span>
            <span className={`font-mono ${incident.data_sources_status.traces ? 'text-emerald-400' : 'text-amber-400'}`}>
              Traces: {incident.data_sources_status.traces ? 'AVAILABLE' : 'DELAYED (60s)'}
            </span>
            <span className={`font-mono ${incident.data_sources_status.topology ? 'text-emerald-400' : 'text-rose-400'}`}>
              Topology: {incident.data_sources_status.topology ? 'AVAILABLE' : 'OFFLINE'}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono italic">
            Dynamic weight rebalancing active
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-800 flex items-center gap-2 text-xs font-medium overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'overview'
              ? 'border-sky-500 text-sky-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Root Causes & Symptoms</span>
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`pb-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'timeline'
              ? 'border-sky-500 text-sky-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Incident Timeline ({incidentTimeline.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('provenance')}
          className={`pb-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'provenance'
              ? 'border-sky-500 text-sky-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <GitBranch className="w-4 h-4" />
          <span>Evidence Provenance Graph</span>
        </button>

        <button
          onClick={() => setActiveTab('lifecycle')}
          className={`pb-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'lifecycle'
              ? 'border-sky-500 text-sky-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Human-in-the-Loop & Audit ({incident.lifecycle_history.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`pb-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'alerts'
              ? 'border-sky-500 text-sky-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertOctagon className="w-4 h-4" />
          <span>Raw Alerts ({incident.alerts.length})</span>
        </button>

        {userRole !== 'VIEWER' && (
          <button
            onClick={() => setActiveTab('traces')}
            className={`pb-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'traces'
                ? 'border-sky-500 text-sky-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Traces ({incidentTraces.length})</span>
          </button>
        )}

        {userRole !== 'VIEWER' && userRole !== 'PARTNER' && userRole !== 'PARTNER_ENGINEER' && (
          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'logs'
                ? 'border-sky-500 text-sky-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Error Logs ({incidentLogs.length})</span>
          </button>
        )}
      </div>

      {/* Tab 1: Overview, Root Causes, Symptoms & Blast Radius */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Symptoms, Contributing Failures, Blast Radius (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* SECTION 4: Dependency Graph & Blast Radius / Reverse Upstream Path */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Network className="w-4 h-4 text-sky-400" />
                  Causal Dependency Flow & Downstream Blast Radius
                </h2>
                <button
                  onClick={onNavigateToTopology}
                  className="text-xs text-sky-400 hover:text-sky-300 font-medium"
                >
                  Full Graph Map →
                </button>
              </div>

              {/* Forward Blast Radius */}
              <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-rose-400 font-mono">
                    Forward Blast Radius: Root ({incident.probable_root_cause}) → Downstream Impact:
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {incident.blast_radius_path.length} consumer hops
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <span className="px-2.5 py-1 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                    {incident.probable_root_cause} [ORIGIN]
                  </span>
                  {incident.blast_radius_path.map((hop, hIdx) => (
                    <React.Fragment key={hIdx}>
                      <span className="text-slate-500 font-bold">→</span>
                      <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {hop}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Reverse Upstream Path */}
              <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-sky-400 font-mono block">
                  Reverse Upstream Path: Symptom Observation → Root Origin:
                </span>
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  {incident.reverse_symptom_path.map((node, nIdx) => (
                    <React.Fragment key={nIdx}>
                      <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {node}
                      </span>
                      {nIdx < incident.reverse_symptom_path.length - 1 && (
                        <span className="text-slate-500 font-bold">←</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            {/* SECTION 3: Symptoms & Contributing Failures */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Symptoms ({incident.symptoms.length}) vs. Contributing Failures ({incident.contributing_failures.length})
              </h2>

              <div className="space-y-3">
                {incident.alerts.map((alert) => {
                  const isRootIndicator = alert.is_root_cause_indicator;
                  const isContributing = alert.alert_type === 'RESOURCE_EXHAUSTION' || alert.alert_type === 'STATE_CHANGE';

                  return (
                    <div
                      key={alert.alert_id}
                      className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-sky-400">
                            {alert.alert_id}
                          </span>
                          <span className="text-xs font-bold text-white">
                            {alert.service}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase font-mono ${
                              isRootIndicator
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : isContributing
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {isRootIndicator ? 'ROOT INDICATOR' : isContributing ? 'CONTRIBUTING HOP' : 'DOWNSTREAM SYMPTOM'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {alert.timestamp.split('T')[1].replace('Z', '')} UTC
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 font-mono">
                          {alert.message}
                        </p>
                      </div>

                      <div className="text-right text-xs font-mono">
                        <span className="text-slate-400 text-[11px] block">
                          Metric: {alert.metric}
                        </span>
                        <span className="text-amber-400 font-bold">
                          {alert.value} / thr {alert.threshold}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: SECTION 2 Probable Root-Cause Candidates */}
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                Probable Root-Cause Candidates
              </h2>
              <p className="text-xs text-slate-400">
                Categorized into root origins, intermediate contributors, and symptoms.
              </p>

              <div className="space-y-4">
                {incident.probable_root_cause_candidates.map((cand, idx) => (
                  <div
                    key={cand.candidate}
                    className={`p-4 rounded-xl border ${
                      cand.classification === 'PROBABLE_ROOT_CAUSE'
                        ? 'bg-amber-950/20 border-amber-800/80 shadow-md'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-400">
                          #{idx + 1}
                        </span>
                        <span className="text-xs font-bold text-white">
                          {cand.candidate}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          cand.classification === 'PROBABLE_ROOT_CAUSE'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : cand.classification === 'CONTRIBUTING_FAILURE'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {cand.classification.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">Confidence: {cand.confidence_label}</span>
                      <span className="text-amber-400 font-bold">Score: {cand.score}</span>
                    </div>

                    {/* Score Bar */}
                    <div className="mt-1.5 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          cand.classification === 'PROBABLE_ROOT_CAUSE' ? 'bg-amber-400' : 'bg-sky-400'
                        }`}
                        style={{ width: `${Math.round(cand.score * 100)}%` }}
                      />
                    </div>

                    {/* Candidate Details */}
                    <div className="mt-3 space-y-1.5 text-[11px] text-slate-300">
                      <div className="text-slate-400 font-mono">
                        Downstream Impact: <strong>{cand.downstream_affected_count} services</strong>
                      </div>
                      <ul className="space-y-1">
                        {cand.evidence_notes.map((note, nIdx) => (
                          <li key={nIdx} className="flex items-start gap-1.5">
                            <span className="text-sky-400 font-bold">•</span>
                            <span>{note}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Quick Confirm Button */}
                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-500">
                        Evidence count: {cand.evidence_count} anchors
                      </span>
                      <button
                        onClick={() => {
                          setConfirmingCandidate(cand.candidate);
                          handleSaveConfirmation();
                        }}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 font-mono text-[11px] border border-slate-700 transition-colors"
                      >
                        ✓ Confirm as Root Cause
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Incident Timeline */}
      {activeTab === 'timeline' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400" />
                Chronological Fault Timeline
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Pinpointing the earliest anomaly as causal trigger in the disaster cascade.
              </p>
            </div>
            {earliestEvent && (
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-amber-950 text-amber-300 border border-amber-800">
                T0 Origin: {earliestEvent.service} ({earliestEvent.timestamp.split('T')[1].replace('Z', '')})
              </span>
            )}
          </div>

          <div className="mt-6 relative pl-6 border-l-2 border-slate-800 space-y-6">
            {incidentTimeline.map((evt, idx) => {
              const isEarliest = idx === 0;
              return (
                <div key={idx} className="relative group">
                  <div
                    className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 ${
                      isEarliest
                        ? 'bg-amber-400 border-amber-200 ring-4 ring-amber-950'
                        : 'bg-slate-700 border-slate-900'
                    }`}
                  />
                  <div
                    className={`p-4 rounded-xl border ${
                      isEarliest
                        ? 'bg-amber-950/20 border-amber-800/80 shadow-md'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-sky-400">
                          {evt.timestamp.split('T')[1].replace('Z', '')} UTC
                        </span>
                        <span className="text-xs font-bold text-white">
                          {evt.service}
                        </span>
                        {isEarliest && (
                          <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-amber-500 text-slate-950">
                            ★ Initial Outage Trigger
                          </span>
                        )}
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            evt.severity === 'CRITICAL'
                              ? 'bg-rose-950 text-rose-300'
                              : 'bg-amber-950 text-amber-300'
                          }`}
                        >
                          {evt.severity}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-slate-500">
                        Source: {evt.source} ({evt.event_type})
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-slate-300 font-mono">
                      {evt.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Provenance Evidence Tree with Clickable Inspector (Section 10) */}
      {activeTab === 'provenance' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-emerald-400" />
              Traceable Evidence Lineage Graph
            </h2>
            <p className="text-xs text-slate-400">
              Click any evidence anchor below to inspect its source telemetry, correlation reason, and weight.
            </p>

            <div className="space-y-2 font-mono text-xs">
              {incident.provenance.detailed_evidence.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedEvidenceItem(item)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedEvidenceItem?.id === item.id
                      ? 'bg-sky-950/60 border-sky-500'
                      : 'bg-slate-950 border-slate-800 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-800 text-sky-300 border border-slate-700">
                        {item.type}
                      </span>
                      <span className="font-bold text-white">{item.id}</span>
                      <span className="text-slate-400">({item.service})</span>
                    </div>
                    <span className="text-[11px] text-amber-400 font-bold">
                      Weight: {Math.round(item.weight_contribution * 100)}%
                    </span>
                  </div>
                  <p className="mt-1 text-slate-300 text-xs font-sans truncate">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Evidence Inspector Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              Evidence Anchor Inspector
            </h3>

            {selectedEvidenceItem ? (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] block">Evidence ID:</span>
                  <span className="text-sky-400 font-bold text-sm">{selectedEvidenceItem.id}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Source Host / Emitter:</span>
                  <span className="text-slate-200">{selectedEvidenceItem.source}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Timestamp:</span>
                  <span className="text-slate-200">{selectedEvidenceItem.timestamp}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Owning Organization:</span>
                  <span className="text-slate-200">{selectedEvidenceItem.organization}</span>
                </div>
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-amber-400 text-[10px] block font-bold">Why it contributed to correlation:</span>
                  <p className="mt-1 text-slate-300 font-sans leading-relaxed">
                    {selectedEvidenceItem.correlation_reason}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500 italic bg-slate-950 rounded-xl border border-slate-800">
                Click any evidence item in the lineage graph to view why it justified this incident grouping.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Human-in-the-Loop & Lifecycle Audit Trail (Sections 7 & 18) */}
      {activeTab === 'lifecycle' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Human Decision Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              Human Confirmation Controls
            </h3>
            <p className="text-xs text-slate-400">
              Distinguish between automated system suggestions and engineer-confirmed verdicts.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-mono">
                  Select Probable Root Cause Candidate:
                </label>
                <select
                  value={confirmingCandidate}
                  onChange={(e) => setConfirmingCandidate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-medium"
                >
                  {incident.probable_root_cause_candidates.map((c) => (
                    <option key={c.candidate} value={c.candidate}>
                      {c.candidate} (Score: {c.score})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-mono">
                  Investigation & Mitigation Notes:
                </label>
                <textarea
                  rows={3}
                  value={humanNotes}
                  onChange={(e) => setHumanNotes(e.target.value)}
                  placeholder="e.g. SRE confirmed connection pool exhaustion on primary PG. Scaling pool from 100 to 250."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white placeholder-slate-600"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-mono">
                  Assign Incident Lead:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={assigneeInput}
                    onChange={(e) => setAssigneeInput(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                  <button
                    onClick={handleSaveAssignee}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg border border-slate-700 font-bold"
                  >
                    Save
                  </button>
                </div>
              </div>

              <button
                onClick={handleSaveConfirmation}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center justify-center gap-1.5 shadow"
              >
                <Check className="w-4 h-4" />
                <span>Confirm Human Root Cause Verdict</span>
              </button>
            </div>
          </div>

          {/* Right Column: Immutable Lifecycle Audit Trail */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-sky-400" />
              Incident Lifecycle Audit Trail ({incident.lifecycle_history.length} events)
            </h3>
            <p className="text-xs text-slate-400">
              Cryptographically timestamped record of every state transition, assignment, and human confirmation.
            </p>

            <div className="space-y-3 font-mono text-xs">
              {incident.lifecycle_history.map((transition, tIdx) => (
                <div
                  key={tIdx}
                  className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1"
                >
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="text-sky-400 font-bold">{transition.actor}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                        {transition.actor_role}
                      </span>
                    </div>
                    <span>{transition.timestamp}</span>
                  </div>
                  <div className="text-slate-200">
                    State Transition: <strong className="text-amber-400">{transition.from_status}</strong> → <strong className="text-emerald-400">{transition.to_status}</strong>
                  </div>
                  {transition.note && (
                    <p className="text-slate-400 font-sans text-xs mt-1">
                      {transition.note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Raw Alerts */}
      {activeTab === 'alerts' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-bold text-white mb-4">
            Underlying Raw Telemetry Alerts ({incident.alerts.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Alert ID</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Service</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Metric Value / Threshold</th>
                  <th className="py-2.5 px-3">Message</th>
                  <th className="py-2.5 px-3">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {incident.alerts.map((a) => (
                  <tr key={a.alert_id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-3 text-sky-400 font-bold">{a.alert_id}</td>
                    <td className="py-3 px-3 text-slate-400">
                      {a.timestamp.split('T')[1].replace('Z', '')}
                    </td>
                    <td className="py-3 px-3 text-slate-200 font-semibold">{a.service}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          a.severity === 'CRITICAL'
                            ? 'bg-rose-950 text-rose-300'
                            : 'bg-amber-950 text-amber-300'
                        }`}
                      >
                        {a.severity}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400">{a.alert_type}</td>
                    <td className="py-3 px-3 text-amber-400 font-bold">
                      {a.value} / {a.threshold}
                    </td>
                    <td className="py-3 px-3 text-slate-300 max-w-xs truncate">{a.message}</td>
                    <td className="py-3 px-3 text-slate-500">{a.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 6: Distributed Traces */}
      {activeTab === 'traces' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-bold text-white mb-2">
            Distributed Trace Spans ({incidentTraces.length})
          </h2>
          <div className="space-y-3 font-mono text-xs">
            {incidentTraces.map((trc, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sky-400">{trc.trace_id}</span>
                    <span className="text-slate-300 font-semibold">{trc.service}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                        trc.status === 'ERROR'
                          ? 'bg-rose-950 text-rose-300'
                          : 'bg-amber-950 text-amber-300'
                      }`}
                    >
                      {trc.status}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-400 text-xs">{trc.operation}</p>
                </div>
                <div className="text-right">
                  <span className="text-amber-400 font-bold block">{trc.duration_ms} ms</span>
                  <span className="text-[11px] text-slate-500">
                    Parent: {trc.parent_service} → Downstream: {trc.downstream_service}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 7: Error Logs */}
      {activeTab === 'logs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-bold text-white mb-2">
            Associated Telemetry Log Messages ({incidentLogs.length})
          </h2>
          <div className="space-y-2.5 font-mono text-xs">
            {incidentLogs.map((log) => (
              <div
                key={log.log_id}
                className="p-3 bg-slate-950 rounded-lg border border-slate-800"
              >
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="text-sky-400 font-bold">{log.log_id}</span>
                    <span className="text-white font-semibold">{log.service}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        log.level === 'FATAL'
                          ? 'bg-rose-950 text-rose-300'
                          : 'bg-amber-950 text-amber-300'
                      }`}
                    >
                      {log.level}
                    </span>
                  </div>
                  <span>{log.timestamp.split('T')[1].replace('Z', '')} UTC</span>
                </div>
                <p className="mt-1.5 text-slate-300 text-xs">{log.message}</p>
                <div className="mt-1 flex items-center gap-3 text-[10px] text-slate-500">
                  <span>Host: {log.host}</span>
                  <span>Trace: {log.trace_id}</span>
                  <span>Request: {log.request_id}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
