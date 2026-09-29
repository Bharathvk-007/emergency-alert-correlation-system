import React, { useState } from 'react';
import { Incident, UserRole, OrganizationId, IncidentStatus } from '../types';
import {
  AlertTriangle,
  Search,
  Filter,
  ArrowRight,
  Download,
  Shield,
  Layers,
  ChevronRight,
  Share2,
  CheckCircle2,
} from 'lucide-react';

interface IncidentListViewProps {
  incidents: Incident[];
  userRole: UserRole;
  currentOrg: OrganizationId;
  onSelectIncident: (id: string) => void;
  onExportAudit: (incident: Incident) => void;
  onOpenShare: (incident: Incident) => void;
  onUpdateStatus: (incidentId: string, status: IncidentStatus) => void;
}

export const IncidentListView: React.FC<IncidentListViewProps> = ({
  incidents,
  userRole,
  currentOrg,
  onSelectIncident,
  onExportAudit,
  onOpenShare,
  onUpdateStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filtered = incidents.filter((inc) => {
    const matchesSearch =
      inc.incident_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.probable_root_cause.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.services.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSeverity =
      severityFilter === 'ALL' || inc.severity === severityFilter;

    const matchesStatus =
      statusFilter === 'ALL' || inc.status === statusFilter;

    return matchesSearch && matchesSeverity && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Header and Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-400" />
            Correlated Incident Triage ({filtered.length} visible)
          </h2>
          <p className="text-xs text-slate-400">
            Filtered according to role permissions ({userRole}) and active tenant ({currentOrg}).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search ID, service, or root cause..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 w-56"
            />
          </div>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="ALL">All Lifecycle States</option>
            <option value="NEW">NEW</option>
            <option value="INVESTIGATING">INVESTIGATING</option>
            <option value="CORRELATED">CORRELATED</option>
            <option value="ROOT_CAUSE_CANDIDATE">ROOT_CAUSE_CANDIDATE</option>
            <option value="MITIGATED">MITIGATED</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>
        </div>
      </div>

      {/* Incident Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg shadow-slate-950/30">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Incident ID</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Lifecycle State</th>
                <th className="py-3 px-4">Affected Services</th>
                <th className="py-3 px-4 text-center">Alerts</th>
                <th className="py-3 px-4">Probable Root Cause</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">Assigned To</th>
                <th className="py-3 px-4">Tenant</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((inc) => (
                <tr
                  key={inc.incident_id}
                  className="hover:bg-slate-800/50 transition-colors group cursor-pointer"
                  onClick={() => onSelectIncident(inc.incident_id)}
                >
                  <td className="py-3.5 px-4 font-mono font-bold text-sky-400">
                    {inc.incident_id}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        inc.severity === 'CRITICAL'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : inc.severity === 'HIGH'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-blue-950 text-blue-300 border border-blue-800'
                      }`}
                    >
                      {inc.severity}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      {inc.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="flex flex-wrap gap-1">
                      {inc.services.map((svc) => (
                        <span
                          key={svc}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700/60 font-medium"
                        >
                          {svc}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-200">
                    {inc.alert_count}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-amber-300">
                        {inc.human_confirmed_root_cause || inc.probable_root_cause}
                      </span>
                      {inc.human_confirmed_root_cause && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-800">
                          CONFIRMED
                        </span>
                      )}
                    </div>
                    <span className="block text-[10px] text-slate-500 font-sans">
                      Top score: {inc.probable_root_cause_candidates[0]?.score || '0.9+'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        inc.confidence_label === 'HIGH'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : inc.confidence_label === 'MEDIUM'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {inc.confidence_label} ({Math.round(inc.confidence_score * 100)}%)
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 text-[11px] truncate max-w-[140px]">
                    {inc.assigned_to}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">
                    {inc.organization_id}
                  </td>
                  <td
                    className="py-3.5 px-4 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onOpenShare(inc)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-white border border-slate-700 transition-colors"
                        title="Share Incident with Partner"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onSelectIncident(inc.incident_id)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 font-medium text-xs flex items-center gap-1 border border-slate-700 transition-colors"
                      >
                        <span>Details</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onExportAudit(inc)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                        title="Export Audit Report"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
