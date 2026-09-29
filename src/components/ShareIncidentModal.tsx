import React, { useState } from 'react';
import { Incident, OrganizationId, SharedPartnerAccess } from '../types';
import {
  X,
  Share2,
  Building2,
  CheckCircle2,
  XCircle,
  Shield,
  FileCheck2,
  Lock,
} from 'lucide-react';

interface ShareIncidentModalProps {
  incident: Incident | null;
  onClose: () => void;
  onConfirmShare: (incidentId: string, shareRecord: SharedPartnerAccess) => void;
}

export const ShareIncidentModal: React.FC<ShareIncidentModalProps> = ({
  incident,
  onClose,
  onConfirmShare,
}) => {
  const [targetOrg, setTargetOrg] = useState<OrganizationId>('ORG-B');
  const [shareAlerts, setShareAlerts] = useState(true);
  const [shareDependencies, setShareDependencies] = useState(true);
  const [shareLogs, setShareLogs] = useState(false);
  const [shareHosts, setShareHosts] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!incident) return null;

  const handleShare = () => {
    const record: SharedPartnerAccess = {
      target_org: targetOrg,
      shared_at: new Date().toISOString(),
      shared_by: 'Alex Rivera (SRE Lead / ORG-A)',
      permitted_services: incident.services.filter(
        (s) => ['CDN', 'Load Balancer', 'API Gateway', 'Message Queue', 'External SMS Provider'].includes(s)
      ),
      share_alerts: shareAlerts,
      share_dependencies: shareDependencies,
      share_logs: shareLogs,
      share_internal_hosts: shareHosts,
    };
    onConfirmShare(incident.incident_id, record);
    setIsSubmitted(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-sky-400" />
            <div>
              <h2 className="text-base font-bold text-white">
                Share Incident: {incident.incident_id}
              </h2>
              <span className="text-xs text-slate-400">
                Privacy-Aware Cross-Organization Collaboration
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs text-slate-300">
          {/* Target Org Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block font-mono">
              Target Partner Organization:
            </label>
            <select
              value={targetOrg}
              onChange={(e) => setTargetOrg(e.target.value as OrganizationId)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-medium focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="ORG-B">ORG-B: Cloud Infrastructure Provider (Compute & Ingress)</option>
              <option value="ORG-C">ORG-C: CDN & Network Partner (Edge & Anycast Routing)</option>
              <option value="ORG-D">ORG-D: External Communication Provider (Carrier SMS)</option>
            </select>
          </div>

          {/* Privacy & Evidence Scoping Checklist */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <span className="text-xs font-bold text-slate-200 uppercase font-mono block">
              Evidence Access Scoping:
            </span>

            <div className="space-y-2">
              <label className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800 cursor-pointer">
                <span className="flex items-center gap-2 text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Incident Summary & Blast Radius Path</span>
                </span>
                <span className="text-[11px] font-mono font-bold text-emerald-400">ALWAYS SHARED</span>
              </label>

              <label className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800 cursor-pointer">
                <span className="flex items-center gap-2 text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Shared Dependency Topology Edges</span>
                </span>
                <input
                  type="checkbox"
                  checked={shareDependencies}
                  onChange={(e) => setShareDependencies(e.target.checked)}
                  className="rounded text-sky-500 focus:ring-sky-500"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800 cursor-pointer">
                <span className="flex items-center gap-2 text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Relevant Perimeter Telemetry Alerts</span>
                </span>
                <input
                  type="checkbox"
                  checked={shareAlerts}
                  onChange={(e) => setShareAlerts(e.target.checked)}
                  className="rounded text-sky-500 focus:ring-sky-500"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded bg-slate-900/40 border border-slate-800/60 cursor-pointer">
                <span className="flex items-center gap-2 text-slate-400">
                  <Lock className="w-4 h-4 text-rose-400" />
                  <span>Private Internal Application Logs</span>
                </span>
                <span className="text-[11px] font-mono text-rose-400 bg-rose-950 px-2 py-0.5 rounded border border-rose-800">
                  PROHIBITED (MASKED)
                </span>
              </label>

              <label className="flex items-center justify-between p-2 rounded bg-slate-900/40 border border-slate-800/60 cursor-pointer">
                <span className="flex items-center gap-2 text-slate-400">
                  <Lock className="w-4 h-4 text-rose-400" />
                  <span>Internal Hostnames & Credentials</span>
                </span>
                <span className="text-[11px] font-mono text-rose-400 bg-rose-950 px-2 py-0.5 rounded border border-rose-800">
                  PROHIBITED (MASKED)
                </span>
              </label>
            </div>
          </div>

          {/* Audit Notice */}
          <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
            Sharing this incident dispatches a cryptographically sanitized telemetry slice to <strong>{targetOrg}</strong>. All sharing events are immutably appended to the incident lifecycle audit trail.
          </p>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleShare}
            disabled={isSubmitted}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition-colors disabled:opacity-50"
          >
            <Share2 className="w-4 h-4" />
            <span>{isSubmitted ? 'Shared Successfully!' : 'Confirm & Share With Partner'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
