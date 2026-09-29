import React, { useState, useMemo } from 'react';
import {
  OrganizationId,
  UserRole,
  DataSourceStatus,
  Incident,
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

import { Navbar, ActiveTab } from './components/Navbar';
import { HeaderControls } from './components/HeaderControls';
import { DashboardView } from './components/DashboardView';
import { IncidentListView } from './components/IncidentListView';
import { IncidentDetailView } from './components/IncidentDetailView';
import { TopologyView } from './components/TopologyView';
import { EvaluationView } from './components/EvaluationView';
import { EdgeCaseRunner } from './components/EdgeCaseRunner';
import { AuditExportModal } from './components/AuditExportModal';
import { DocsModal } from './components/DocsModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [currentOrg, setCurrentOrg] = useState<OrganizationId>('ORG-A');
  const [currentRole, setCurrentRole] = useState<UserRole>('ENGINEER');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>('INC-001');
  const [auditIncident, setAuditIncident] = useState<Incident | null>(null);

  // Telemetry stream toggles
  const [sourcesStatus, setSourcesStatus] = useState<DataSourceStatus>({
    alerts: true,
    logs: true,
    traces: true,
    topology: true,
    timeline: true,
  });

  // Toggle individual source
  const handleToggleSource = (sourceKey: keyof DataSourceStatus) => {
    if (sourceKey === 'alerts') return; // Alerts are core
    setSourcesStatus((prev) => ({
      ...prev,
      [sourceKey]: !prev[sourceKey],
    }));
  };

  // Presets
  const handleApplyPreset = (presetName: string) => {
    if (presetName === 'ALL_ACTIVE') {
      setSourcesStatus({
        alerts: true,
        logs: true,
        traces: true,
        topology: true,
        timeline: true,
      });
    } else if (presetName === 'LOGS_DELAYED') {
      setSourcesStatus({
        alerts: true,
        logs: false,
        traces: true,
        topology: true,
        timeline: true,
      });
    } else if (presetName === 'TRACES_MISSING') {
      setSourcesStatus({
        alerts: true,
        logs: true,
        traces: false,
        topology: true,
        timeline: true,
      });
    } else if (presetName === 'MULTI_DOWN') {
      setSourcesStatus({
        alerts: true,
        logs: false,
        traces: false,
        topology: true,
        timeline: true,
      });
    }
  };

  // Run Correlation Engine
  const allIncidents = useMemo(() => {
    const engine = new CorrelationEngine(TOPOLOGY_EDGES);
    return engine.correlate(
      RAW_ALERTS,
      LOG_RECORDS,
      TRACE_SPANS,
      TIMELINE_EVENTS,
      sourcesStatus
    );
  }, [sourcesStatus]);

  // Filter Incidents according to Organization and Role
  const visibleIncidents = useMemo(() => {
    return allIncidents.filter((inc) => {
      // Role ADMIN or INCIDENT_COMMANDER can see all incidents
      if (currentRole === 'ADMIN' || currentRole === 'INCIDENT_COMMANDER') {
        return true;
      }

      // Role PARTNER only sees shared boundary services
      if (currentRole === 'PARTNER') {
        const sharedServices = [
          'CDN',
          'Load Balancer',
          'External SMS Provider',
          'Message Queue',
          'Notification Service',
        ];
        return inc.services.some((s) => sharedServices.includes(s));
      }

      // By default filter by tenant organization
      return inc.organization_id === currentOrg;
    });
  }, [allIncidents, currentOrg, currentRole]);

  // Run Benchmark Evaluation
  const evaluationReport = useMemo(() => {
    return runBenchmarkEvaluation(
      RAW_ALERTS,
      LOG_RECORDS,
      TRACE_SPANS,
      TOPOLOGY_EDGES,
      TIMELINE_EVENTS
    );
  }, []);

  const selectedIncident = useMemo(() => {
    if (!selectedIncidentId) return visibleIncidents[0] || allIncidents[0] || null;
    return allIncidents.find((i) => i.incident_id === selectedIncidentId) || visibleIncidents[0] || null;
  }, [selectedIncidentId, visibleIncidents, allIncidents]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Main Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activeIncidentCount={visibleIncidents.length}
        selectedIncidentId={selectedIncidentId}
        onOpenAudit={() => setAuditIncident(selectedIncident)}
      />

      {/* Role, Organization, and Telemetry Source Switchers */}
      <HeaderControls
        currentOrg={currentOrg}
        onOrgChange={setCurrentOrg}
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        sourcesStatus={sourcesStatus}
        onToggleSource={handleToggleSource}
        onApplyPreset={handleApplyPreset}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            incidents={visibleIncidents}
            allAlerts={RAW_ALERTS}
            sourcesStatus={sourcesStatus}
            userRole={currentRole}
            currentOrg={currentOrg}
            onSelectIncident={(id) => {
              setSelectedIncidentId(id);
              setActiveTab('detail');
            }}
            onNavigateToTopology={() => setActiveTab('topology')}
            onNavigateToEvaluation={() => setActiveTab('evaluation')}
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
          />
        )}

        {activeTab === 'topology' && (
          <TopologyView
            edges={TOPOLOGY_EDGES}
            allAlerts={RAW_ALERTS}
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

        {activeTab === 'docs' && <DocsModal />}
      </main>

      {/* Audit Export Modal */}
      {auditIncident && (
        <AuditExportModal
          incident={auditIncident}
          onClose={() => setAuditIncident(null)}
        />
      )}

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-4 px-6 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>Emergency Alert Correlation System • 35% Milestone Complete</span>
          <span>FastAPI + React 19 + TypeScript • Explainable Observability</span>
        </div>
      </footer>
    </div>
  );
}
