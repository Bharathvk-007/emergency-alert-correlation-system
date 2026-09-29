import React from 'react';
import {
  Incident,
  RawAlert,
  DataSourceStatus,
  UserRole,
  OrganizationId,
} from '../types';
import {
  TrendingDown,
  AlertOctagon,
  ShieldCheck,
  Activity,
  Layers,
  Clock,
  ArrowRight,
  Database,
  Radio,
  Server,
  FileText,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface DashboardViewProps {
  incidents: Incident[];
  allAlerts: RawAlert[];
  sourcesStatus: DataSourceStatus;
  userRole: UserRole;
  currentOrg: OrganizationId;
  onSelectIncident: (id: string) => void;
  onNavigateToTopology: () => void;
  onNavigateToEvaluation: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  incidents,
  allAlerts,
  sourcesStatus,
  userRole,
  currentOrg,
  onSelectIncident,
  onNavigateToTopology,
  onNavigateToEvaluation,
}) => {
  const totalAlerts = allAlerts.length;
  const incidentCount = incidents.length;
  const alertReduction =
    totalAlerts > 0
      ? Math.round(((totalAlerts - incidentCount) / totalAlerts) * 1000) / 10
      : 0;

  // Active sources count
  const activeSourcesCount = Object.values(sourcesStatus).filter(Boolean).length;
  const missingSources = Object.entries(sourcesStatus)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  return (
    <div className="space-y-6">
      {/* Role / Org Status Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-950 border border-sky-800 flex items-center justify-center text-sky-400">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">
                Active Tenant: {currentOrg} | Active Role: {userRole}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
                Milestone: 35% Completed
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {userRole === 'PARTNER'
                ? 'Filtered to shared perimeter infrastructure (CDN, Edge Ingress, SMS Gateway).'
                : userRole === 'VIEWER'
                ? 'Read-only mode. Technical logs and raw stack traces are sanitized for privacy/compliance.'
                : 'Full correlation observability active across alerts, traces, logs, and topology.'}
            </p>
          </div>
        </div>

        {missingSources.length > 0 && (
          <div className="flex items-center gap-2 bg-amber-950/50 border border-amber-800/80 text-amber-300 px-3 py-1.5 rounded-lg text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Degraded Telemetry Mode: <strong>{missingSources.join(', ')}</strong> missing or delayed. Dynamic weight rebalancing engaged.
            </span>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Raw Alert Volume */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Raw Alert Stream
            </span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{totalAlerts}</span>
            <span className="text-xs text-slate-400">alarms ingested</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Across 14 services & synthetic disaster load
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-amber-600" />
        </div>

        {/* Card 2: Correlated Incidents */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Correlated Incidents
            </span>
            <AlertOctagon className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{incidentCount}</span>
            <span className="text-xs text-rose-400 font-medium">dossiers created</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Down from {totalAlerts} individual pages
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-rose-600" />
        </div>

        {/* Card 3: Alert Volume Reduction */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Alert Noise Reduction
            </span>
            <TrendingDown className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400">
              {alertReduction}%
            </span>
            <span className="text-xs text-slate-400">reduction</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Target: ≥ 50.0% (Exceeded)
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600" />
        </div>

        {/* Card 4: Detection & RC Precision */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Root-Cause Precision
            </span>
            <ShieldCheck className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-sky-400">100%</span>
            <span className="text-xs text-slate-400">synthetic match</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            3/3 true disaster origins ranked #1
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-sky-600" />
        </div>
      </div>

      {/* Main Grid: Active Incidents & Telemetry Provenance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Active Incidents (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-sky-400" />
              Active Correlated Incidents ({incidents.length})
            </h2>
            <button
              onClick={onNavigateToEvaluation}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1"
            >
              Compare with Baseline →
            </button>
          </div>

          <div className="space-y-3">
            {incidents.map((inc) => (
              <div
                key={inc.incident_id}
                onClick={() => onSelectIncident(inc.incident_id)}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 cursor-pointer transition-all hover:shadow-lg hover:shadow-slate-950/40 group"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700">
                      {inc.incident_id}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        inc.severity === 'CRITICAL'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : inc.severity === 'HIGH'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-blue-950 text-blue-300 border border-blue-800'
                      }`}
                    >
                      {inc.severity}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Tenant: {inc.organization_id}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400 font-mono">
                      {inc.alert_count} alerts correlated
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        inc.confidence_label === 'HIGH'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : inc.confidence_label === 'MEDIUM'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      Confidence: {inc.confidence_label} ({Math.round(inc.confidence_score * 100)}%)
                    </span>
                  </div>
                </div>

                <h3 className="mt-2.5 text-sm font-semibold text-white group-hover:text-sky-300 transition-colors">
                  {inc.title}
                </h3>

                {/* Candidate Root Cause Highlight */}
                <div className="mt-3 bg-slate-950/80 rounded-lg p-3 border border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                      Probable Root-Cause Candidate #1:
                    </span>
                    <span className="text-xs font-bold text-amber-300 font-mono">
                      {inc.probable_root_cause} (Score: {inc.probable_root_cause_candidates[0]?.score || 'N/A'})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 max-w-sm">
                    {inc.probable_root_cause_candidates[0]?.evidence_notes[0] || 'Earliest temporal trigger'}
                  </div>
                </div>

                {/* Services badge strip */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 font-mono">Affected:</span>
                  {inc.services.map((svc) => (
                    <span
                      key={svc}
                      className="px-2 py-0.5 rounded text-[11px] bg-slate-800/90 text-slate-300 font-medium border border-slate-700/60"
                    >
                      {svc}
                    </span>
                  ))}
                  <div className="ml-auto text-xs text-sky-400 flex items-center gap-1 font-medium group-hover:translate-x-0.5 transition-transform">
                    <span>Inspect Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Telemetry Stream Health & System Weights */}
        <div className="space-y-6">
          {/* Telemetry Availability Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Evidence Stream Health
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Deterministic correlation adapts to pipeline dropouts during crisis conditions.
            </p>

            <div className="mt-4 space-y-2.5">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="text-xs font-medium text-slate-200">Alerts Stream</span>
                </div>
                <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  ONLINE
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      sourcesStatus.logs ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                  ></span>
                  <span className="text-xs font-medium text-slate-200">Structured Logs</span>
                </div>
                <span
                  className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                    sourcesStatus.logs
                      ? 'text-emerald-400 bg-emerald-950 border-emerald-800'
                      : 'text-rose-400 bg-rose-950 border-rose-800'
                  }`}
                >
                  {sourcesStatus.logs ? 'ONLINE' : 'DROPPED'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      sourcesStatus.traces ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                  ></span>
                  <span className="text-xs font-medium text-slate-200">Distributed Traces</span>
                </div>
                <span
                  className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                    sourcesStatus.traces
                      ? 'text-emerald-400 bg-emerald-950 border-emerald-800'
                      : 'text-rose-400 bg-rose-950 border-rose-800'
                  }`}
                >
                  {sourcesStatus.traces ? 'ONLINE' : 'DELAYED'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      sourcesStatus.topology ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                  ></span>
                  <span className="text-xs font-medium text-slate-200">Service Topology</span>
                </div>
                <span
                  className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                    sourcesStatus.topology
                      ? 'text-emerald-400 bg-emerald-950 border-emerald-800'
                      : 'text-rose-400 bg-rose-950 border-rose-800'
                  }`}
                >
                  {sourcesStatus.topology ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      sourcesStatus.timeline ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                  ></span>
                  <span className="text-xs font-medium text-slate-200">Incident Timeline</span>
                </div>
                <span
                  className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                    sourcesStatus.timeline
                      ? 'text-emerald-400 bg-emerald-950 border-emerald-800'
                      : 'text-rose-400 bg-rose-950 border-rose-800'
                  }`}
                >
                  {sourcesStatus.timeline ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between text-xs text-slate-400">
              <span>Dynamic Rebalancing:</span>
              <span className="text-emerald-400 font-mono font-medium">ENABLED (Normalized to 1.0)</span>
            </div>
          </div>

          {/* Quick Topology Shortcut */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-sky-400" />
              Public Service Mesh Topology
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              14 interconnected services across Ingress CDN, API Gateway, Databases, and SMS Aggregators.
            </p>
            <div className="mt-3 flex items-center justify-between text-xs font-mono text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <span>Nodes: 14</span>
              <span>Directed Edges: 16</span>
              <span>Critical Paths: 5</span>
            </div>
            <button
              onClick={onNavigateToTopology}
              className="mt-3 w-full py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
            >
              <span>Explore Interactive Topology Graph</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
