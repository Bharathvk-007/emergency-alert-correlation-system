import React from 'react';
import {
  OrganizationId,
  UserRole,
  DataSourceStatus,
  SimulationState,
} from '../types';
import { ORGANIZATIONS } from '../data/syntheticDataset';
import {
  Shield,
  Building2,
  Activity,
  Play,
  Pause,
  RotateCcw,
  Zap,
  FastForward,
  Clock,
  Radio,
  Sliders,
} from 'lucide-react';

interface HeaderControlsProps {
  currentOrg: OrganizationId;
  onOrgChange: (org: OrganizationId) => void;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  sourcesStatus: DataSourceStatus;
  onToggleSource: (sourceKey: keyof DataSourceStatus) => void;
  onApplyPreset: (presetName: string) => void;
  simulationState: SimulationState;
  onStartSim: () => void;
  onPauseSim: () => void;
  onResumeSim: () => void;
  onResetSim: () => void;
  onLoadAllSim: () => void;
  onSpeedChange: (speed: number) => void;
  onInjectNoise: () => void;
}

export const HeaderControls: React.FC<HeaderControlsProps> = ({
  currentOrg,
  onOrgChange,
  currentRole,
  onRoleChange,
  sourcesStatus,
  onToggleSource,
  onApplyPreset,
  simulationState,
  onStartSim,
  onPauseSim,
  onResumeSim,
  onResetSim,
  onLoadAllSim,
  onSpeedChange,
  onInjectNoise,
}) => {
  const activeSourcesCount = Object.values(sourcesStatus).filter(Boolean).length;

  return (
    <div className="bg-slate-900 border-b border-slate-800 text-slate-200">
      {/* Top Bar: Ingestion Simulation Controller (Section 4 & 25) */}
      <div className="bg-slate-950/80 px-4 py-2 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-amber-400 font-mono text-[11px]">
              <Radio className="w-3.5 h-3.5 animate-pulse text-rose-500" />
              Live Telemetry Stream:
            </span>
            <span className="font-mono text-slate-300">
              {simulationState.processedAlertCount} / {simulationState.totalSteps} alarms ingested
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              Virtual Clock: +{simulationState.elapsedVirtualSec}s
            </span>
          </div>

          {/* Simulation Playback Buttons */}
          <div className="flex items-center gap-1.5">
            {!simulationState.isRunning ? (
              <button
                onClick={onStartSim}
                className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold text-xs transition-colors shadow"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Start Stream</span>
              </button>
            ) : simulationState.isPaused ? (
              <button
                onClick={onResumeSim}
                className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold text-xs transition-colors shadow"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Resume</span>
              </button>
            ) : (
              <button
                onClick={onPauseSim}
                className="flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-semibold text-xs transition-colors shadow"
              >
                <Pause className="w-3 h-3 fill-current" />
                <span>Pause</span>
              </button>
            )}

            <button
              onClick={onResetSim}
              className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-xs transition-colors"
              title="Reset stream to zero"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>

            <button
              onClick={onLoadAllSim}
              className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded border border-slate-700 text-xs transition-colors"
              title="Instant load all alerts"
            >
              <FastForward className="w-3 h-3" />
              <span>Load Full Set</span>
            </button>

            {/* Speed Multiplier */}
            <div className="flex items-center bg-slate-900 border border-slate-700 rounded p-0.5 text-[11px] font-mono">
              <span className="px-1.5 text-slate-500">Speed:</span>
              <button
                onClick={() => onSpeedChange(1)}
                className={`px-1.5 py-0.5 rounded ${simulationState.speedMultiplier === 1 ? 'bg-sky-600 text-white font-bold' : 'text-slate-400'}`}
              >
                1x
              </button>
              <button
                onClick={() => onSpeedChange(2)}
                className={`px-1.5 py-0.5 rounded ${simulationState.speedMultiplier === 2 ? 'bg-sky-600 text-white font-bold' : 'text-slate-400'}`}
              >
                2x
              </button>
              <button
                onClick={() => onSpeedChange(5)}
                className={`px-1.5 py-0.5 rounded ${simulationState.speedMultiplier === 5 ? 'bg-sky-600 text-white font-bold' : 'text-slate-400'}`}
              >
                5x
              </button>
            </div>

            <button
              onClick={onInjectNoise}
              className="px-2 py-1 bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 rounded border border-purple-800/80 text-xs font-mono transition-colors"
              title="Inject random crawl bot noise alert"
            >
              + Inject Noise
            </button>
          </div>
        </div>
      </div>

      {/* Main Filter Bar: Tenant, Persona & Telemetry Source Degradation Controls */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Organization Switcher */}
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Tenant:
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
            Role Persona:
          </span>
          <select
            value={currentRole}
            onChange={(e) => onRoleChange(e.target.value as UserRole)}
            className="bg-slate-800 border border-slate-700 text-xs rounded-md px-2.5 py-1.5 font-medium text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ADMIN">ADMIN (Full Access & Weights)</option>
            <option value="SRE_ENGINEER">SRE_ENGINEER (Deep Traces & Topology)</option>
            <option value="INCIDENT_COMMANDER">INCIDENT_COMMANDER (Blast Radius & Comms)</option>
            <option value="PARTNER_ENGINEER">PARTNER_ENGINEER (Shared Perimeter Only)</option>
            <option value="VIEWER">VIEWER (Read-Only Summaries / Logs Hidden)</option>
          </select>
        </div>

        {/* Telemetry Availability Simulator */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            Telemetry Streams:
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
              Logs {sourcesStatus.logs ? 'AVAILABLE' : 'MISSING'}
            </button>

            <button
              onClick={() => onToggleSource('traces')}
              className={`px-2 py-0.5 text-xs rounded font-mono font-medium border transition-colors ${
                sourcesStatus.traces
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900/60'
                  : 'bg-amber-950/80 text-amber-300 border-amber-800/80 hover:bg-amber-900/60'
              }`}
              title="Click to toggle distributed traces availability"
            >
              Traces {sourcesStatus.traces ? 'AVAILABLE' : 'DELAYED (60s)'}
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
              Topology {sourcesStatus.topology ? 'AVAILABLE' : 'OFFLINE'}
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
            className="px-2 py-1 bg-rose-950/50 hover:bg-rose-900/50 text-rose-300 rounded border border-rose-800/60 text-[11px]"
          >
            Logs Missing
          </button>
          <button
            onClick={() => onApplyPreset('TRACES_MISSING')}
            className="px-2 py-1 bg-amber-950/50 hover:bg-amber-900/50 text-amber-300 rounded border border-amber-800/60 text-[11px]"
          >
            Traces Delayed
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
