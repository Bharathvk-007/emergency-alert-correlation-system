import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  OrganizationId,
  UserRole,
  DataSourceStatus,
  Incident,
  IncidentStatus,
  SharedPartnerAccess,
  RawAlert,
} from './types';
import {
  RAW_ALERTS,
  LOG_RECORDS,
  TRACE_SPANS,
  TOPOLOGY_EDGES,
  TIMELINE_EVENTS,
  ORGANIZATIONS,
} from './data/syntheticDataset';
import { CorrelationEngine } from './engine/correlationEngine';
import { runBenchmarkEvaluation } from './engine/evaluation';
import { AlertSimulator } from './engine/simulation';

import { Navbar, ActiveTab } from './components/Navbar';
import { HeaderControls } from './components/HeaderControls';
import { DashboardView } from './components/DashboardView';
import { IncidentListView } from './components/IncidentListView';
import { IncidentDetailView } from './components/IncidentDetailView';
import { TopologyView } from './components/TopologyView';
import { EvaluationView } from './components/EvaluationView';
import { EdgeCaseRunner } from './components/EdgeCaseRunner';
import { StakeholderValidationView } from './components/StakeholderValidationView';
import { AuditExportModal } from './components/AuditExportModal';
import { ShareIncidentModal } from './components/ShareIncidentModal';
import { DocsModal } from './components/DocsModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [currentOrg, setCurrentOrg] = useState<OrganizationId>('ORG-A');
  const [currentRole, setCurrentRole] = useState<UserRole>('SRE_ENGINEER');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>('INC-001');
  const [auditIncident, setAuditIncident] = useState<Incident | null>(null);
  const [shareIncident, setShareIncident] = useState<Incident | null>(null);

  // Active alerts stream managed by live simulator
  const [streamAlerts, setStreamAlerts] = useState<RawAlert[]>(RAW_ALERTS);

  // Telemetry stream toggles
  const [sourcesStatus, setSourcesStatus] = useState<DataSourceStatus>({
    alerts: true,
    logs: true,
    traces: true,
    topology: true,
    timeline: true,
  });

  // Persistent incident store for delayed reconciliation & human modifications
  const persistentIncidentsRef = useRef<Incident[]>([]);

  // Simulation Controller instance
  const simulatorRef = useRef<AlertSimulator | null>(null);
  const [simState, setSimState] = useState({
    isRunning: false,
    isPaused: false,
    speedMultiplier: 1,
    currentStep: RAW_ALERTS.length,
    totalSteps: RAW_ALERTS.length,
    elapsedVirtualSec: 0,
    processedAlertCount: RAW_ALERTS.length,
  });

  useEffect(() => {
    simulatorRef.current = new AlertSimulator(RAW_ALERTS, (activeAlerts, newAlert, state) => {
      setStreamAlerts(activeAlerts);
      setSimState(state);
    });
  }, []);

  const handleStartSim = () => {
    simulatorRef.current?.start();
  };
  const handlePauseSim = () => {
    simulatorRef.current?.pause();
  };
  const handleResumeSim = () => {
    simulatorRef.current?.resume();
  };
  const handleResetSim = () => {
    simulatorRef.current?.reset();
    persistentIncidentsRef.current = [];
  };
  const handleLoadAllSim = () => {
    simulatorRef.current?.loadAll();
  };
  const handleSpeedChange = (spd: number) => {
    simulatorRef.current?.setSpeed(spd);
  };
  const handleInjectNoise = () => {
    const noiseAlert: RawAlert = {
      alert_id: `ALT-NOISE-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString(),
      organization_id: 'ORG-A',
      service: 'Authentication Service',
      host: 'auth-svc-02',
      severity: 'LOW',
      alert_type: 'METRIC_ANOMALY',
      metric: 'rate_limit_hits_sec',
      value: 19.5,
      threshold: 15.0,
      message: 'Single IP crawl bot rate limiting spike (Synthetic noise injection)',
      source: 'AuthGuard',
      ground_truth_incident_id: 'NOISE',
      is_root_cause_indicator: false,
    };
    setStreamAlerts((prev) => [noiseAlert, ...prev]);
  };

  // Toggle individual source
  const handleToggleSource = (sourceKey: keyof DataSourceStatus) => {
    if (sourceKey === 'alerts') return;
    setSourcesStatus((prev) => ({
      ...prev,
      [sourceKey]: !prev[sourceKey],
    }));
  };

  // Presets
  const handleApplyPreset = (presetName: string) => {
    if (presetName === 'ALL_ACTIVE') {
      setSourcesStatus({ alerts: true, logs: true, traces: true, topology: true, timeline: true });
    } else if (presetName === 'LOGS_DELAYED') {
      setSourcesStatus({ alerts: true, logs: false, traces: true, topology: true, timeline: true });
    } else if (presetName === 'TRACES_MISSING') {
      setSourcesStatus({ alerts: true, logs: true, traces: false, topology: true, timeline: true });
    } else if (presetName === 'MULTI_DOWN') {
      setSourcesStatus({ alerts: true, logs: false, traces: false, topology: true, timeline: true });
    }
  };

  // Run Correlation Engine with Delayed Evidence Reconciliation
  const allIncidents = useMemo(() => {
    const engine = new CorrelationEngine(TOPOLOGY_EDGES);
    const newComputedIncidents = engine.correlate(
      streamAlerts,
      LOG_RECORDS,
      TRACE_SPANS,
      TIMELINE_EVENTS,
      sourcesStatus,
      persistentIncidentsRef.current
    );
    persistentIncidentsRef.current = newComputedIncidents;
    return newComputedIncidents;
  }, [streamAlerts, sourcesStatus]);

  // Lifecycle updates
  const handleUpdateStatus = (incidentId: string, newStatus: IncidentStatus) => {
    persistentIncidentsRef.current = persistentIncidentsRef.current.map((inc) => {
      if (inc.incident_id === incidentId) {
        const transition = {
          timestamp: new Date().toISOString(),
          from_status: inc.status,
          to_status: newStatus,
          actor: 'Alex Rivera (SRE On-Call)',
          actor_role: currentRole,
          note: `Manual lifecycle transition triggered in UI to ${newStatus}`,
        };
        return {
          ...inc,
          status: newStatus,
          lifecycle_history: [...inc.lifecycle_history, transition],
          updated_at: new Date().toISOString(),
          resolved_at: newStatus === 'RESOLVED' ? new Date().toISOString() : inc.resolved_at,
        };
      }
      return inc;
    });
    setStreamAlerts([...streamAlerts]); // trigger re-render
  };

  const handleConfirmRootCause = (incidentId: string, candidate: string, notes: string) => {
    persistentIncidentsRef.current = persistentIncidentsRef.current.map((inc) => {
      if (inc.incident_id === incidentId) {
        const transition = {
          timestamp: new Date().toISOString(),
          from_status: inc.status,
          to_status: 'ROOT_CAUSE_CANDIDATE' as IncidentStatus,
          actor: 'Alex Rivera (SRE Lead)',
          actor_role: currentRole,
          note: `Human confirmation: Root cause verified as '${candidate}'. Notes: ${notes}`,
        };
        return {
          ...inc,
          status: 'ROOT_CAUSE_CANDIDATE' as IncidentStatus,
          probable_root_cause: candidate,
          human_confirmed_root_cause: candidate,
          human_confirmation_notes: notes,
          human_confirmed_by: 'Alex Rivera (SRE Lead)',
          human_confirmed_at: new Date().toISOString(),
          lifecycle_history: [...inc.lifecycle_history, transition],
          updated_at: new Date().toISOString(),
        };
      }
      return inc;
    });
    setStreamAlerts([...streamAlerts]);
  };

  const handleAssignEngineer = (incidentId: string, assignee: string) => {
    persistentIncidentsRef.current = persistentIncidentsRef.current.map((inc) => {
      if (inc.incident_id === incidentId) {
        return {
          ...inc,
          assigned_to: assignee,
          updated_at: new Date().toISOString(),
        };
      }
      return inc;
    });
    setStreamAlerts([...streamAlerts]);
  };

  const handleConfirmShare = (incidentId: string, shareRecord: SharedPartnerAccess) => {
    persistentIncidentsRef.current = persistentIncidentsRef.current.map((inc) => {
      if (inc.incident_id === incidentId) {
        return {
          ...inc,
          shared_with: [...inc.shared_with, shareRecord],
          lifecycle_history: [
            ...inc.lifecycle_history,
            {
              timestamp: new Date().toISOString(),
              from_status: inc.status,
              to_status: inc.status,
              actor: shareRecord.shared_by,
              actor_role: currentRole,
              note: `Shared sanitized telemetry slice with partner ${shareRecord.target_org}. Internal logs masked.`,
            },
          ],
        };
      }
      return inc;
    });
    setStreamAlerts([...streamAlerts]);
  };

  // Filter Incidents according to Organization and Role
  const visibleIncidents = useMemo(() => {
    return allIncidents.filter((inc) => {
      if (currentRole === 'ADMIN' || currentRole === 'INCIDENT_COMMANDER') {
        return true;
      }
      if (currentRole === 'PARTNER' || currentRole === 'PARTNER_ENGINEER') {
        const sharedServices = [
          'CDN',
          'Load Balancer',
          'External SMS Provider',
          'Message Queue',
          'Notification Service',
        ];
        return (
          inc.services.some((s) => sharedServices.includes(s)) ||
          inc.shared_with.some((s) => s.target_org === currentOrg)
        );
      }
      return inc.organization_id === currentOrg;
    });
  }, [allIncidents, currentOrg, currentRole]);

  // Run Benchmark Evaluation
  const evaluationReport = useMemo(() => {
    return runBenchmarkEvaluation(
      streamAlerts,
      LOG_RECORDS,
      TRACE_SPANS,
      TOPOLOGY_EDGES,
      TIMELINE_EVENTS
    );
  }, [streamAlerts]);

  const selectedIncident = useMemo(() => {
    if (!selectedIncidentId) return visibleIncidents[0] || allIncidents[0] || null;
    return allIncidents.find((i) => i.incident_id === selectedIncidentId) || visibleIncidents[0] || null;
  }, [selectedIncidentId, visibleIncidents, allIncidents]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activeIncidentCount={visibleIncidents.length}
        selectedIncidentId={selectedIncidentId}
        onOpenAudit={() => setAuditIncident(selectedIncident)}
      />

      {/* Header Controls: Simulation, Org, Role, Source Toggles */}
      <HeaderControls
        currentOrg={currentOrg}
        onOrgChange={setCurrentOrg}
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        sourcesStatus={sourcesStatus}
        onToggleSource={handleToggleSource}
        onApplyPreset={handleApplyPreset}
        simulationState={simState}
        onStartSim={handleStartSim}
        onPauseSim={handlePauseSim}
        onResumeSim={handleResumeSim}
        onResetSim={handleResetSim}
        onLoadAllSim={handleLoadAllSim}
        onSpeedChange={handleSpeedChange}
        onInjectNoise={handleInjectNoise}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            incidents={visibleIncidents}
            allAlerts={streamAlerts}
            sourcesStatus={sourcesStatus}
            userRole={currentRole}
            currentOrg={currentOrg}
            simulationState={simState}
            onSelectIncident={(id) => {
              setSelectedIncidentId(id);
              setActiveTab('detail');
            }}
            onNavigateToTopology={() => setActiveTab('topology')}
            onNavigateToEvaluation={() => setActiveTab('evaluation')}
            onNavigateToValidation={() => setActiveTab('validation')}
          />
        )}

        {activeTab === 'incidents' && (
          <IncidentListView
            incidents={visibleIncidents}
            userRole={currentRole}
            currentOrg={currentOrg}
            onSelectIncident={(id) => {
              setSelectedIncidentId(id);
              setActiveTab('detail');
            }}
            onExportAudit={(inc) => setAuditIncident(inc)}
            onOpenShare={(inc) => setShareIncident(inc)}
            onUpdateStatus={handleUpdateStatus}
          />
        )}

        {activeTab === 'detail' && selectedIncident && (
          <IncidentDetailView
            incident={selectedIncident}
            allLogs={LOG_RECORDS}
            allTraces={TRACE_SPANS}
            allTimeline={TIMELINE_EVENTS}
            userRole={currentRole}
            currentOrg={currentOrg}
            onBack={() => setActiveTab('incidents')}
            onExportAudit={(inc) => setAuditIncident(inc)}
            onNavigateToTopology={() => setActiveTab('topology')}
            onOpenShare={(inc) => setShareIncident(inc)}
            onUpdateStatus={handleUpdateStatus}
            onConfirmRootCause={handleConfirmRootCause}
            onAssignEngineer={handleAssignEngineer}
          />
        )}

        {activeTab === 'topology' && (
          <TopologyView
            edges={TOPOLOGY_EDGES}
            allAlerts={streamAlerts}
            incidents={visibleIncidents}
            allLogs={LOG_RECORDS}
            allTraces={TRACE_SPANS}
            userRole={currentRole}
            onSelectIncident={(id) => {
              setSelectedIncidentId(id);
              setActiveTab('detail');
            }}
          />
        )}

        {activeTab === 'evaluation' && (
          <EvaluationView
            evaluationReport={evaluationReport}
            onNavigateToEdgeCases={() => setActiveTab('edge_cases')}
          />
        )}

        {activeTab === 'edge_cases' && (
          <EdgeCaseRunner
            sourcesStatus={sourcesStatus}
            onApplySources={setSourcesStatus}
            incidents={visibleIncidents}
            onSelectIncident={(id) => {
              setSelectedIncidentId(id);
              setActiveTab('detail');
            }}
          />
        )}

        {activeTab === 'validation' && <StakeholderValidationView />}

        {activeTab === 'docs' && <DocsModal />}
      </main>

      {/* Audit Export Modal */}
      {auditIncident && (
        <AuditExportModal
          incident={auditIncident}
          onClose={() => setAuditIncident(null)}
        />
      )}

      {/* Share Incident Modal */}
      {shareIncident && (
        <ShareIncidentModal
          incident={shareIncident}
          onClose={() => setShareIncident(null)}
          onConfirmShare={handleConfirmShare}
        />
      )}

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-4 px-6 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>Emergency Alert Correlation System • 70% Milestone Complete</span>
          <span>FastAPI + React 19 + TypeScript • Explainable Observability & Provenance</span>
        </div>
      </footer>
    </div>
  );
}
