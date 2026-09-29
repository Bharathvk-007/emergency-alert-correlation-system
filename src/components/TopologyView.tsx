import React, { useState } from 'react';
import {
  TopologyEdge,
  RawAlert,
  Incident,
  LogRecord,
  TraceSpan,
  UserRole,
} from '../types';
import {
  Network,
  Database,
  Server,
  Radio,
  Layers,
  Activity,
  AlertTriangle,
  Info,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface TopologyViewProps {
  edges: TopologyEdge[];
  allAlerts: RawAlert[];
  incidents: Incident[];
  allLogs: LogRecord[];
  allTraces: TraceSpan[];
  userRole: UserRole;
  onSelectIncident: (id: string) => void;
}

// Fixed visual layout coordinates for the 14 services in SVG space
const SERVICE_LAYOUT: Record<string, { x: number; y: number; category: string }> = {
  CDN: { x: 120, y: 70, category: 'Edge / Ingress' },
  'Load Balancer': { x: 300, y: 70, category: 'Edge / Ingress' },
  'Web Frontend': { x: 500, y: 70, category: 'Presentation' },
  'API Gateway': { x: 500, y: 220, category: 'Gateway' },
  'Authentication Service': { x: 260, y: 220, category: 'Core Service' },
  'User Service': { x: 260, y: 340, category: 'Core Service' },
  'Emergency Data Service': { x: 740, y: 220, category: 'Data Ingestion' },
  'Redis Cache': { x: 500, y: 360, category: 'Data / Storage' },
  'PostgreSQL Database': { x: 740, y: 360, category: 'Data / Storage' },
  'Alert Service': { x: 740, y: 90, category: 'Alerting' },
  'Notification Service': { x: 940, y: 90, category: 'Messaging' },
  'Message Queue': { x: 940, y: 220, category: 'Broker' },
  'External SMS Provider': { x: 940, y: 360, category: 'External Partner' },
  'External Email Provider': { x: 1100, y: 220, category: 'External Partner' },
};

export const TopologyView: React.FC<TopologyViewProps> = ({
  edges,
  allAlerts,
  incidents,
  allLogs,
  allTraces,
  userRole,
  onSelectIncident,
}) => {
  const [selectedService, setSelectedService] = useState<string>('PostgreSQL Database');
  const [highlightIncident, setHighlightIncident] = useState<string>('ALL');

  // Count active alerts per service
  const serviceAlertMap = new Map<string, RawAlert[]>();
  allAlerts.forEach((a) => {
    if (!serviceAlertMap.has(a.service)) serviceAlertMap.set(a.service, []);
    serviceAlertMap.get(a.service)!.push(a);
  });

  // Services associated with highlightIncident
  const activeIncidentObj = incidents.find((i) => i.incident_id === highlightIncident);
  const highlightedServices = activeIncidentObj ? activeIncidentObj.services : [];

  const selectedAlerts = serviceAlertMap.get(selectedService) || [];
  const selectedLogs = allLogs.filter((l) => l.service === selectedService);
  const selectedTraces = allTraces.filter((t) => t.service === selectedService);

  // Upstream and downstream dependencies
  const upstreamDependencies = edges
    .filter((e) => e.target_service === selectedService)
    .map((e) => e.source_service);
  const downstreamDependencies = edges
    .filter((e) => e.source_service === selectedService)
    .map((e) => e.target_service);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Network className="w-5 h-5 text-sky-400" />
            Public Service Dependency Topology
          </h2>
          <p className="text-xs text-slate-400">
            Interactive directed graph representing all 14 microservices and edge gateways.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">Highlight Incident:</span>
          <select
            value={highlightIncident}
            onChange={(e) => setHighlightIncident(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
          >
            <option value="ALL">Show Full Mesh</option>
            {incidents.map((i) => (
              <option key={i.incident_id} value={i.incident_id}>
                {i.incident_id}: {i.probable_root_cause}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Graph + Service Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Interactive SVG Graph (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-hidden relative shadow-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
            <span>Directed Edge Flow: Upstream Caller → Downstream Provider</span>
            <span>Click any node to inspect telemetry</span>
          </div>

          <div className="overflow-x-auto bg-slate-950/90 rounded-lg p-2 border border-slate-800/80">
            <svg
              viewBox="0 0 1200 450"
              className="w-full h-auto min-w-[750px]"
              style={{ maxHeight: '500px' }}
            >
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="8"
                  markerHeight="6"
                  refX="16"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 8 3, 0 6" fill="#38bdf8" />
                </marker>
                <marker
                  id="arrowhead-crit"
                  markerWidth="8"
                  markerHeight="6"
                  refX="16"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 8 3, 0 6" fill="#f43f5e" />
                </marker>
              </defs>

              {/* Render Directed Edges */}
              {edges.map((e, idx) => {
                const s = SERVICE_LAYOUT[e.source_service];
                const t = SERVICE_LAYOUT[e.target_service];
                if (!s || !t) return null;

                const isIncidentActive =
                  highlightIncident !== 'ALL' &&
                  highlightedServices.includes(e.source_service) &&
                  highlightedServices.includes(e.target_service);

                return (
                  <g key={idx}>
                    <line
                      x1={s.x + 60}
                      y1={s.y + 20}
                      x2={t.x + 60}
                      y2={t.y + 20}
                      stroke={isIncidentActive ? '#f43f5e' : '#334155'}
                      strokeWidth={isIncidentActive ? 2.5 : 1.5}
                      strokeDasharray={e.dependency_type === 'cache' ? '4 3' : undefined}
                      markerEnd={isIncidentActive ? 'url(#arrowhead-crit)' : 'url(#arrowhead)'}
                    />
                  </g>
                );
              })}

              {/* Render Service Nodes */}
              {Object.entries(SERVICE_LAYOUT).map(([name, pos]) => {
                const alerts = serviceAlertMap.get(name) || [];
                const isSelected = selectedService === name;
                const isIncidentActive =
                  highlightIncident === 'ALL' || highlightedServices.includes(name);
                const hasCritical = alerts.some((a) => a.severity === 'CRITICAL');
                const hasHigh = alerts.some((a) => a.severity === 'HIGH');

                return (
                  <g
                    key={name}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={() => setSelectedService(name)}
                    className="cursor-pointer group"
                  >
                    {/* Node Rectangle */}
                    <rect
                      x="0"
                      y="0"
                      width="135"
                      height="44"
                      rx="8"
                      className={`transition-all ${
                        isSelected
                          ? 'fill-sky-950 stroke-sky-400 stroke-2'
                          : isIncidentActive && hasCritical
                          ? 'fill-rose-950/80 stroke-rose-600 stroke-2'
                          : isIncidentActive && hasHigh
                          ? 'fill-amber-950/80 stroke-amber-600 stroke-2'
                          : 'fill-slate-900 stroke-slate-700 hover:stroke-slate-500'
                      }`}
                    />

                    {/* Alert Badge if alerts exist */}
                    {alerts.length > 0 && (
                      <g transform="translate(118, -4)">
                        <circle
                          r="9"
                          className={
                            hasCritical ? 'fill-rose-500' : 'fill-amber-500'
                          }
                        />
                        <text
                          x="0"
                          y="3"
                          textAnchor="middle"
                          className="fill-white font-mono font-bold text-[9px]"
                        >
                          {alerts.length}
                        </text>
                      </g>
                    )}

                    {/* Node Label */}
                    <text
                      x="10"
                      y="19"
                      className="fill-white font-semibold text-[11px] select-none"
                    >
                      {name.length > 18 ? name.slice(0, 17) + '…' : name}
                    </text>
                    <text
                      x="10"
                      y="33"
                      className="fill-slate-400 font-mono text-[9px] select-none"
                    >
                      {pos.category}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right Column: Service Inspector Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold text-sky-400 font-mono">
                Service Inspector
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                  selectedAlerts.length > 0
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}
              >
                {selectedAlerts.length > 0 ? `${selectedAlerts.length} ALARMS` : 'HEALTHY'}
              </span>
            </div>
            <h3 className="mt-1 text-base font-bold text-white tracking-tight">
              {selectedService}
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Category: {SERVICE_LAYOUT[selectedService]?.category || 'Microservice'}
            </p>
          </div>

          {/* Dependency Links */}
          <div className="space-y-3 bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 font-mono text-[11px] block">
                Upstream Consumers (Inbound requests):
              </span>
              <div className="mt-1 flex flex-wrap gap-1">
                {upstreamDependencies.length > 0 ? (
                  upstreamDependencies.map((u) => (
                    <span
                      key={u}
                      onClick={() => setSelectedService(u)}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-mono text-[10px] cursor-pointer"
                    >
                      {u}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500 font-mono text-[10px]">None (Ingress edge)</span>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-slate-400 font-mono text-[11px] block">
                Downstream Dependencies (Outgoing queries):
              </span>
              <div className="mt-1 flex flex-wrap gap-1">
                {downstreamDependencies.length > 0 ? (
                  downstreamDependencies.map((d) => (
                    <span
                      key={d}
                      onClick={() => setSelectedService(d)}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-mono text-[10px] cursor-pointer"
                    >
                      {d}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500 font-mono text-[10px]">None (Leaf backend)</span>
                )}
              </div>
            </div>
          </div>

          {/* Active Alerts for Selected Service */}
          <div>
            <h4 className="text-xs font-bold text-white mb-2 flex items-center justify-between">
              <span>Related Active Alerts ({selectedAlerts.length})</span>
            </h4>
            {selectedAlerts.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {selectedAlerts.map((a) => (
                  <div
                    key={a.alert_id}
                    className="p-2.5 rounded bg-slate-950 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono font-bold text-sky-400">{a.alert_id}</span>
                      <span
                        className={`font-bold ${
                          a.severity === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400'
                        }`}
                      >
                        {a.severity}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-300 text-xs font-mono">{a.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic bg-slate-950 p-3 rounded border border-slate-800">
                No active alarms reporting from this service.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
