import React from 'react';
import {
  OrganizationId,
  UserRole,
  DataSourceStatus,
} from '../types';
import { ORGANIZATIONS } from '../data/syntheticDataset';
import {
  Shield,
  Building2,
  Database,
  Radio,
  Share2,
  FileText,
  Activity,
  Layers,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

interface HeaderControlsProps {
  currentOrg: OrganizationId;
  onOrgChange: (org: OrganizationId) => void;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  sourcesStatus: DataSourceStatus;
  onToggleSource: (sourceKey: keyof DataSourceStatus) => void;
  onApplyPreset: (presetName: string) => void;
}

export const HeaderControls: React.FC<HeaderControlsProps> = ({
  currentOrg,
  onOrgChange,
  currentRole,
  onRoleChange,
  sourcesStatus,
  onToggleSource,
  onApplyPreset,
}) => {
  const activeSourcesCount = Object.values(sourcesStatus).filter(Boolean).length;

  return (
    <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 text-slate-200">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Organization Switcher */}
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Tenant Org:
          </span>
          <select
            value={currentOrg}
            onChange={(e) => onOrgChange(e.target.value as OrganizationId)}
            className="bg-slate-800 border border-slate-700 text-xs rounded-md px-2.5 py-1.5 font-medium text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            {ORGANIZATIONS.map((org) => (
              <option key={org.id} value={org.id}>
                {org.id}: {org.name}
              </option>
            ))}
          </select>
        </div>

        {/* Role Switcher */}
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Persona / Role:
          </span>
          <select
            value={currentRole}
            onChange={(e) => onRoleChange(e.target.value as UserRole)}
            className="bg-slate-800 border border-slate-700 text-xs rounded-md px-2.5 py-1.5 font-medium text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ADMIN">ADMIN (Full Access & Weights)</option>
            <option value="ENGINEER">ENGINEER (Deep Traces & Topology)</option>
            <option value="INCIDENT_COMMANDER">INCIDENT_COMMANDER (Blast Radius & Comms)</option>
            <option value="PARTNER">PARTNER (Boundary Services Only)</option>
            <option value="VIEWER">VIEWER (Read-Only Summaries)</option>
          </select>
        </div>

        {/* Telemetry Availability Simulator */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            Telemetry Streams ({activeSourcesCount}/5):
          </span>
          <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-md border border-slate-800">
            <button
              onClick={() => onToggleSource('alerts')}
              disabled
              title="Alerts stream is core and cannot be disabled"
              className="px-2 py-0.5 text-xs rounded font-mono font-medium bg-emerald-950 text-emerald-300 border border-emerald-800/80 cursor-not-allowed"
            >
              Alerts ✓
            </button>

            <button
              onClick={() => onToggleSource('logs')}
              className={`px-2 py-0.5 text-xs rounded font-mono font-medium border transition-colors ${
                sourcesStatus.logs
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900/60'
                  : 'bg-rose-950/80 text-rose-300 border-rose-800/80 hover:bg-rose-900/60'
              }`}
              title="Click to toggle logs availability"
            >
              Logs {sourcesStatus.logs ? '✓' : '✗'}
            </button>

            <button
              onClick={() => onToggleSource('traces')}
              className={`px-2 py-0.5 text-xs rounded font-mono font-medium border transition-colors ${
                sourcesStatus.traces
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900/60'
                  : 'bg-rose-950/80 text-rose-300 border-rose-800/80 hover:bg-rose-900/60'
              }`}
              title="Click to toggle distributed traces availability"
            >
              Traces {sourcesStatus.traces ? '✓' : '✗'}
            </button>

            <button
              onClick={() => onToggleSource('topology')}
              className={`px-2 py-0.5 text-xs rounded font-mono font-medium border transition-colors ${
                sourcesStatus.topology
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900/60'
                  : 'bg-rose-950/80 text-rose-300 border-rose-800/80 hover:bg-rose-900/60'
              }`}
              title="Click to toggle service topology availability"
            >
              Topology {sourcesStatus.topology ? '✓' : '✗'}
            </button>

            <button
              onClick={() => onToggleSource('timeline')}
              className={`px-2 py-0.5 text-xs rounded font-mono font-medium border transition-colors ${
                sourcesStatus.timeline
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900/60'
                  : 'bg-rose-950/80 text-rose-300 border-rose-800/80 hover:bg-rose-900/60'
              }`}
              title="Click to toggle timeline availability"
            >
              Timeline {sourcesStatus.timeline ? '✓' : '✗'}
            </button>
          </div>
        </div>

        {/* Quick Simulation Presets */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-500 font-mono text-[11px]">Degrade Presets:</span>
          <button
            onClick={() => onApplyPreset('ALL_ACTIVE')}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-[11px]"
          >
            All Active
          </button>
          <button
            onClick={() => onApplyPreset('LOGS_DELAYED')}
            className="px-2 py-1 bg-amber-950/50 hover:bg-amber-900/50 text-amber-300 rounded border border-amber-800/60 text-[11px]"
          >
            Logs Dropped
          </button>
          <button
            onClick={() => onApplyPreset('TRACES_MISSING')}
            className="px-2 py-1 bg-amber-950/50 hover:bg-amber-900/50 text-amber-300 rounded border border-amber-800/60 text-[11px]"
          >
            Traces Offline
          </button>
          <button
            onClick={() => onApplyPreset('MULTI_DOWN')}
            className="px-2 py-1 bg-rose-950/50 hover:bg-rose-900/50 text-rose-300 rounded border border-rose-800/60 text-[11px]"
          >
            Multi-Down
          </button>
        </div>
      </div>
    </div>
  );
};
