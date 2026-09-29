import React, { useState } from 'react';
import {
  Incident,
  LogRecord,
  TraceSpan,
  TimelineEvent,
  UserRole,
  OrganizationId,
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
  ExternalLink,
  ChevronDown,
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
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'alerts' | 'traces' | 'logs' | 'provenance'>('overview');

  // Filter logs, traces, and timeline to this incident
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
            onClick={() => onExportAudit(incident)}
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 px-3.5 py-1.5 rounded-lg shadow transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Audit Explanation</span>
          </button>
        </div>
      </div>

      {/* Incident Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
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
            <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
              Tenant: {incident.organization_id}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Correlation Confidence
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

        <h1 className="mt-3 text-xl font-bold text-white tracking-tight">
          {incident.title}
        </h1>

        <p className="mt-2 text-xs text-slate-300 leading-relaxed max-w-4xl bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
          <strong>System Inference:</strong> {incident.correlation_explanation}
        </p>

        {/* Affected services strip */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
            Affected Services ({incident.services.length}):
          </span>
          {incident.services.map((svc) => (
            <span
              key={svc}
              className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700"
            >
              {svc}
            </span>
          ))}
        </div>
      </div>

      {/* Tabs navigation */}
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
          <span>Overview & Symptoms</span>
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
          onClick={() => setActiveTab('alerts')}
          className={`pb-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'alerts'
              ? 'border-sky-500 text-sky-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertOctagon className="w-4 h-4" />
          <span>Grouped Alerts ({incident.alerts.length})</span>
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
            <span>Distributed Traces ({incidentTraces.length})</span>
          </button>
        )}

        {userRole !== 'VIEWER' && userRole !== 'PARTNER' && (
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

        <button
          onClick={() => setActiveTab('provenance')}
          className={`pb-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'provenance'
              ? 'border-sky-500 text-sky-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <GitBranch className="w-4 h-4" />
          <span>Provenance Lineage Tree</span>
        </button>
      </div>

      {/* Tab 1: Overview & Symptoms */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Symptoms & Topology Path (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Symptoms Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Detected Downstream Symptoms ({incident.symptoms.length})
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Observable degradations, latency spikes, and error rates clustered under this incident.
              </p>

              <div className="mt-4 space-y-2.5">
                {incident.alerts.map((alert) => (
                  <div
                    key={alert.alert_id}
                    className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-sky-400">
                          {alert.alert_id}
                        </span>
                        <span className="text-xs font-semibold text-white">
                          {alert.service}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                            alert.severity === 'CRITICAL'
                              ? 'bg-rose-950 text-rose-300'
                              : 'bg-amber-950 text-amber-300'
                          }`}
                        >
                          {alert.severity}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {alert.timestamp.split('T')[1].replace('Z', '')} UTC
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 font-mono">
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
                ))}
              </div>
            </div>

            {/* Topology Dependency Flow Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Network className="w-4 h-4 text-sky-400" />
                  Dependency Cascade Path
                </h2>
                <button
                  onClick={onNavigateToTopology}
                  className="text-xs text-sky-400 hover:text-sky-300 font-medium"
                >
                  Full Graph →
                </button>
              </div>

              <div className="mt-4 p-4 bg-slate-950 rounded-lg border border-slate-800">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  {incident.services.map((svc, idx) => (
                    <React.Fragment key={svc}>
                      <span
                        className={`px-3 py-1.5 rounded-lg border font-bold ${
                          svc === incident.probable_root_cause
                            ? 'bg-amber-950 text-amber-300 border-amber-600 shadow-md'
                            : 'bg-slate-900 text-slate-300 border-slate-700'
                        }`}
                      >
                        {svc} {svc === incident.probable_root_cause ? '★ [CANDIDATE ROOT]' : ''}
                      </span>
                      {idx < incident.services.length - 1 && (
                        <span className="text-slate-500 font-bold">→</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  Fault propagation direction: Originating upstream defect in <strong>{incident.probable_root_cause}</strong> cascades downstream to consumer layers.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Probable Root Cause Candidates */}
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                Probable Root-Cause Candidates
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Deterministic explainable scoring based on temporal precedence, graph depth, and fault indicators.
              </p>

              <div className="mt-4 space-y-4">
                {incident.probable_root_cause_candidates.map((cand, idx) => (
                  <div
                    key={cand.candidate}
                    className={`p-3.5 rounded-lg border ${
                      idx === 0
                        ? 'bg-amber-950/30 border-amber-800/80 shadow'
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
                        className={`text-xs font-mono font-extrabold px-2 py-0.5 rounded ${
                          cand.score >= 0.8
                            ? 'bg-emerald-950 text-emerald-300'
                            : cand.score >= 0.5
                            ? 'bg-amber-950 text-amber-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        Score: {cand.score}
                      </span>
                    </div>

                    {/* Score Bar */}
                    <div className="mt-2 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          idx === 0 ? 'bg-amber-400' : 'bg-sky-400'
                        }`}
                        style={{ width: `${Math.round(cand.score * 100)}%` }}
                      />
                    </div>

                    {/* Evidence Notes */}
                    <ul className="mt-2.5 space-y-1 text-[11px] text-slate-300">
                      {cand.evidence_notes.map((note, nIdx) => (
                        <li key={nIdx} className="flex items-start gap-1.5">
                          <span className="text-sky-400 font-bold">•</span>
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-400">
                <span className="font-semibold text-slate-300 block mb-1">
                  Correlation Epistemology:
                </span>
                Claims of causality are non-dogmatic. Candidates are ranked based on available evidence with graceful fallback when telemetry signals are absent.
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
                  {/* Dot */}
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

      {/* Tab 3: Grouped Alerts */}
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

      {/* Tab 4: Distributed Traces */}
      {activeTab === 'traces' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-bold text-white mb-2">
            Distributed Trace Spans ({incidentTraces.length})
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            Correlated request traces showing end-to-end latency breakdowns and span errors.
          </p>

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
                  <span className="text-amber-400 font-bold block">
                    {trc.duration_ms} ms
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Parent: {trc.parent_service} → Downstream: {trc.downstream_service}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Error Logs */}
      {activeTab === 'logs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-bold text-white mb-2">
            Associated Telemetry Log Messages ({incidentLogs.length})
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            Structured logs matched by time window and service error keywords.
          </p>

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

      {/* Tab 6: Provenance Lineage Tree */}
      {activeTab === 'provenance' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-emerald-400" />
            Immutable Provenance & Evidence Chain
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Complete backward traceability explaining why these alerts were grouped and why the root cause was nominated.
          </p>

          <div className="mt-4 p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto">
            <div className="text-sky-400 font-bold">
              {incident.incident_id} (Tenant: {incident.organization_id})
            </div>
            <div className="pl-4 border-l-2 border-slate-800 mt-2 space-y-2">
              <div>
                <span className="text-amber-400 font-bold">├── Grouped Alerts ({incident.alerts.length}):</span>
                <div className="pl-4 text-slate-400">
                  {incident.alerts.map((a) => (
                    <div key={a.alert_id}>
                      +-- {a.alert_id}: {a.service} ({a.metric} = {a.value}) [{a.severity}]
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-sky-400 font-bold">├── Linked Distributed Traces:</span>
                <div className="pl-4 text-slate-400">
                  {incident.linked_traces.length > 0
                    ? incident.linked_traces.map((t) => <div key={t}>+-- Trace ID: {t}</div>)
                    : <div>+-- (Traces delayed or not sampled)</div>}
                </div>
              </div>

              <div>
                <span className="text-emerald-400 font-bold">├── Associated Log Evidence:</span>
                <div className="pl-4 text-slate-400">
                  {incident.linked_logs.length > 0
                    ? incident.linked_logs.map((l) => <div key={l}>+-- Log ID: {l}</div>)
                    : <div>+-- (Logs delayed or offline)</div>}
                </div>
              </div>

              <div>
                <span className="text-purple-400 font-bold">├── Active Topology Edges:</span>
                <div className="pl-4 text-slate-400">
                  {incident.provenance.topology_edges.map((e, idx) => (
                    <div key={idx}>+-- {e.source} → {e.target}</div>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-rose-400 font-bold">└── Probable Root Cause Candidate:</span>
                <div className="pl-4 text-amber-300 font-bold">
                  └── {incident.probable_root_cause} (Confidence Score: {incident.probable_root_cause_candidates[0]?.score})
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
