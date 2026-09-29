import React from 'react';
import {
  AlertCircle,
  Network,
  BarChart3,
  Flame,
  FileCheck2,
  BookOpen,
  FlaskConical,
  ExternalLink,
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'incidents'
  | 'detail'
  | 'topology'
  | 'evaluation'
  | 'edge_cases'
  | 'docs';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  activeIncidentCount: number;
  selectedIncidentId: string | null;
  onOpenAudit: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  activeIncidentCount,
  selectedIncidentId,
  onOpenAudit,
}) => {
  return (
    <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-500 via-amber-500 to-sky-500 flex items-center justify-center shadow-lg shadow-rose-950/40">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white tracking-tight text-base sm:text-lg">
                Emergency Alert Correlation
              </span>
              <span className="text-[10px] uppercase font-mono font-semibold px-2 py-0.5 rounded bg-sky-950/80 text-sky-300 border border-sky-800/80">
                35% Milestone
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Public Emergency Portal Observability & Causality Engine
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1">
          <button
            onClick={() => onTabChange('dashboard')}
            className={`px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'dashboard'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => onTabChange('incidents')}
            className={`px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'incidents' || activeTab === 'detail'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            <span>Incidents</span>
            {activeIncidentCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-rose-500 text-white">
                {activeIncidentCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onTabChange('topology')}
            className={`px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'topology'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Network className="w-4 h-4" />
            <span>Topology Map</span>
          </button>

          <button
            onClick={() => onTabChange('evaluation')}
            className={`px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'evaluation'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FlaskConical className="w-4 h-4 text-emerald-400" />
            <span>Evaluation</span>
          </button>

          <button
            onClick={() => onTabChange('edge_cases')}
            className={`px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'edge_cases'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>Edge Cases</span>
          </button>

          <button
            onClick={() => onTabChange('docs')}
            className={`px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'docs'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Docs</span>
          </button>
        </nav>

        {/* Audit Export Trigger */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAudit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-sky-600 hover:bg-sky-500 text-white shadow transition-colors"
            title="Export audit-ready incident report"
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Audit Report</span>
          </button>
        </div>
      </div>
    </header>
  );
};
