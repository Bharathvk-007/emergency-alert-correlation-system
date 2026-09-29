import React, { useState } from 'react';
import {
  BookOpen,
  Shield,
  Layers,
  FileText,
  Network,
  Users,
  CheckCircle2,
} from 'lucide-react';

export const DocsModal: React.FC = () => {
  const [docTab, setDocTab] = useState<'problem' | 'workflow' | 'architecture'>('problem');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Top Selector */}
      <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-sky-400" />
          <h2 className="text-base font-bold text-white">
            Engineering Specifications & Governance Documents
          </h2>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setDocTab('problem')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              docTab === 'problem'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            1. Problem Analysis
          </button>
          <button
            onClick={() => setDocTab('workflow')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              docTab === 'workflow'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            2. User & Workflow Map
          </button>
          <button
            onClick={() => setDocTab('architecture')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              docTab === 'architecture'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            3. Architecture Blueprint
          </button>
        </div>
      </div>

      {/* Document Content View */}
      <div className="p-6 text-xs text-slate-300 space-y-6 leading-relaxed max-w-4xl mx-auto">
        {docTab === 'problem' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white">
              Problem Analysis: Emergency Alert Correlation System
            </h3>
            <p>
              A public emergency-information website must remain available during disasters. During incidents, monitoring systems generate a large number of noisy alerts. Engineers struggle to distinguish symptoms from root causes.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="font-bold text-amber-400 block mb-1">
                  Downstream Symptoms
                </span>
                <ul className="space-y-1 list-disc pl-4 text-slate-400">
                  <li>API Gateway HTTP 5xx spike (35.2% error rate)</li>
                  <li>Web Frontend client timeout alerts increased</li>
                  <li>Database query latency increased on active queries</li>
                  <li>Notification service dispatch buffer backpressure</li>
                </ul>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="font-bold text-rose-400 block mb-1">
                  Probable Root Causes
                </span>
                <ul className="space-y-1 list-disc pl-4 text-slate-400">
                  <li>PostgreSQL connection pool exhausted (max_connections reached)</li>
                  <li>CDN origin shield invalidation storm & route drop</li>
                  <li>Message queue partition consumer lag & disk I/O stall</li>
                  <li>Physical storage I/O wait latency saturation</li>
                </ul>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="font-bold text-sky-400">
                Epistemological Principle:
              </span>
              <p className="text-slate-300">
                In distributed systems observability, root cause can rarely be claimed with certainty unless deterministic evidence proves it. The system uniformly uses non-dogmatic terminology: <em>"probable root cause"</em>, <em>"candidate root cause"</em>, and <em>"correlated evidence"</em>.
              </p>
            </div>
          </div>
        )}

        {docTab === 'workflow' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white">
              User Personas & Multi-Tenant Permission Model
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-800 rounded-lg overflow-hidden">
                <thead className="bg-slate-950 text-slate-400">
                  <tr>
                    <th className="p-3">Role</th>
                    <th className="p-3">Persona</th>
                    <th className="p-3">Visibility</th>
                    <th className="p-3">Permissions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-950/60 font-mono text-[11px]">
                  <tr>
                    <td className="p-3 font-bold text-emerald-400">ADMIN</td>
                    <td className="p-3 font-sans">Org Administrator</td>
                    <td className="p-3">Full tenant & weights</td>
                    <td className="p-3 font-sans">Configure weights, export audit, manage users</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-sky-400">ENGINEER</td>
                    <td className="p-3 font-sans">Platform / SRE</td>
                    <td className="p-3">Technical alerts, topology, logs, traces</td>
                    <td className="p-3 font-sans">Triage incidents, inspect traces, simulate edge cases</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-amber-400">INCIDENT_COMMANDER</td>
                    <td className="p-3 font-sans">Incident Commander</td>
                    <td className="p-3">Executive summaries, blast radius, timeline</td>
                    <td className="p-3 font-sans">Declare status, confirm root causes, export comms briefings</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-purple-400">PARTNER</td>
                    <td className="p-3 font-sans">External CDN / Telco</td>
                    <td className="p-3">Shared boundary dependencies only</td>
                    <td className="p-3 font-sans">Acknowledge shared SLA alerts (internal logs hidden)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-slate-400">VIEWER</td>
                    <td className="p-3 font-sans">Read-Only Observer</td>
                    <td className="p-3">Read-only summaries</td>
                    <td className="p-3 font-sans">View dashboards (sensitive logs sanitized)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="font-bold text-sky-400 block mb-1">
                Multi-Tenant Isolation:
              </span>
              <p>
                <strong>ORG-A</strong> (Emergency Website Operations), <strong>ORG-B</strong> (Cloud/CDN Partner), and <strong>ORG-C</strong> (Emergency Telecom Partner) maintain segregated tenancy while supporting correlation across shared boundary edges (e.g., CDN $\rightarrow$ Load Balancer).
              </p>
            </div>
          </div>
        )}

        {docTab === 'architecture' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white">
              Mathematical Scoring & Dynamic Weight Rebalancing
            </h3>
            <p>
              Pairwise affinity score between alerts $a_i$ and $a_j$:
            </p>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-amber-300">
              score = 0.25 * time + 0.20 * service + 0.20 * topology + 0.15 * trace + 0.10 * log + 0.10 * severity
            </div>
            <p className="mt-2">
              When one data source is delayed or missing, active weights are dynamically renormalized:
            </p>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-emerald-300">
              w_k* = (w_k * is_available(k)) / sum(w_m * is_available(m))
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
