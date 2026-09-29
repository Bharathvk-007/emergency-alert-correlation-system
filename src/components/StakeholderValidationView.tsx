import React, { useState } from 'react';
import { StakeholderQuestionnaireResponse, OrganizationId } from '../types';
import { SAMPLE_STAKEHOLDER_RESPONSES } from '../data/syntheticDataset';
import {
  Users,
  CheckCircle2,
  MessageSquare,
  Send,
  Star,
  Shield,
  HelpCircle,
  Clock,
} from 'lucide-react';

export const StakeholderValidationView: React.FC = () => {
  const [responses, setResponses] = useState<StakeholderQuestionnaireResponse[]>(
    SAMPLE_STAKEHOLDER_RESPONSES
  );
  const [activeRole, setActiveRole] = useState<
    'SRE_ENGINEER' | 'INCIDENT_COMMANDER' | 'PLATFORM_ENGINEER' | 'PARTNER'
  >('SRE_ENGINEER');

  // Form state for entering new stakeholder validation feedback
  const [respondentName, setRespondentName] = useState('');
  const [organization, setOrganization] = useState<OrganizationId>('ORG-A');
  const [q1, setQ1] = useState(5);
  const [q2, setQ2] = useState(true);
  const [q3, setQ3] = useState(5);
  const [q4, setQ4] = useState(5);
  const [q5, setQ5] = useState(5);
  const [q6, setQ6] = useState(75);
  const [q7, setQ7] = useState('');
  const [q8, setQ8] = useState('');
  const [submittedBanner, setSubmittedBanner] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!respondentName.trim()) return;

    const newFeedback: StakeholderQuestionnaireResponse = {
      role: activeRole,
      respondent_name: respondentName,
      organization,
      submitted_at: new Date().toISOString(),
      q1_grouping_clarity: q1,
      q2_reason_identifiable: q2,
      q3_traceability_score: q3,
      q4_dependency_graph_utility: q4,
      q5_missing_data_clarity: q5,
      q6_effort_reduction_pct: q6,
      q7_confusing_parts: q7 || 'None specified.',
      q8_suggested_improvements: q8 || 'None specified.',
      is_synthetic_demo: false, // Real input!
    };

    setResponses([newFeedback, ...responses]);
    setSubmittedBanner(true);
    setRespondentName('');
    setQ7('');
    setQ8('');
    setTimeout(() => setSubmittedBanner(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-400" />
            Stakeholder Validation & Operational Feedback Engine
          </h2>
          <p className="text-xs text-slate-400">
            Section 19: Validating explainability, cognitive load reduction, and usability across real incident responders.
          </p>
        </div>

        <span className="text-xs font-mono px-3 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
          Total Responses: {responses.length}
        </span>
      </div>

      {submittedBanner && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Feedback submitted successfully and appended to the live validation audit record.</span>
        </div>
      )}

      {/* Main Grid: Form (1 col) + Existing Responses (2 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Questionnaire Input Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4"
        >
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            Submit Operator Assessment
          </h3>

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-slate-400 uppercase">
              Stakeholder Role:
            </label>
            <select
              value={activeRole}
              onChange={(e) => setActiveRole(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
            >
              <option value="SRE_ENGINEER">SRE / Platform Engineer</option>
              <option value="INCIDENT_COMMANDER">Incident Commander (IC)</option>
              <option value="PLATFORM_ENGINEER">Infrastructure Platform Lead</option>
              <option value="PARTNER">External Partner (CDN / Telco)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-slate-400 uppercase">
              Respondent Name / Title:
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Jordan Lee (On-Call SRE)"
              value={respondentName}
              onChange={(e) => setRespondentName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder-slate-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-slate-400 uppercase">
              Organization:
            </label>
            <select
              value={organization}
              onChange={(e) => setOrganization(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
            >
              <option value="ORG-A">ORG-A: Emergency Website Operations</option>
              <option value="ORG-B">ORG-B: Cloud Infrastructure Provider</option>
              <option value="ORG-C">ORG-C: CDN & Network Partner</option>
              <option value="ORG-D">ORG-D: External Communication Provider</option>
            </select>
          </div>

          {/* Rating 1 */}
          <div className="space-y-1 text-xs">
            <label className="text-slate-300">
              1. Is alert grouping easier to understand? (1-5)
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={q1}
              onChange={(e) => setQ1(Number(e.target.value))}
              className="w-full"
            />
            <span className="text-[11px] font-mono text-sky-400">Rating: {q1} / 5</span>
          </div>

          {/* Question 2 */}
          <div className="space-y-1 text-xs">
            <label className="text-slate-300 block">
              2. Can you easily identify why alerts were grouped?
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="q2"
                  checked={q2}
                  onChange={() => setQ2(true)}
                />
                <span>Yes, clearly visible</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="q2"
                  checked={!q2}
                  onChange={() => setQ2(false)}
                />
                <span>No, unclear</span>
              </label>
            </div>
          </div>

          {/* Rating 3 */}
          <div className="space-y-1 text-xs">
            <label className="text-slate-300">
              3. Can you trace the probable cause back to evidence? (1-5)
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={q3}
              onChange={(e) => setQ3(Number(e.target.value))}
              className="w-full"
            />
            <span className="text-[11px] font-mono text-sky-400">Rating: {q3} / 5</span>
          </div>

          {/* Rating 6 */}
          <div className="space-y-1 text-xs">
            <label className="text-slate-300">
              6. Estimated triage effort reduction: ({q6}%)
            </label>
            <input
              type="range"
              min="10"
              max="95"
              step="5"
              value={q6}
              onChange={(e) => setQ6(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-slate-400 uppercase">
              7. Which part is confusing?
            </label>
            <textarea
              rows={2}
              value={q7}
              onChange={(e) => setQ7(e.target.value)}
              placeholder="e.g. Weight distribution when topology is offline..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder-slate-600"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-slate-400 uppercase">
              8. Suggested improvements:
            </label>
            <textarea
              rows={2}
              value={q8}
              onChange={(e) => setQ8(e.target.value)}
              placeholder="e.g. Add one-click Slack broadcast..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder-slate-600"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Validation Feedback</span>
          </button>
        </form>

        {/* Right Column: Existing Recorded Feedback */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">
              Collected Stakeholder Feedback Records
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              Clearly labeled: [DEMO / SYNTHETIC] vs [REAL OPERATOR INPUT]
            </span>
          </div>

          <div className="space-y-3">
            {responses.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">
                      {item.respondent_name}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-sky-300 border border-slate-700">
                      {item.role}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      {item.organization}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      item.is_synthetic_demo
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}
                  >
                    {item.is_synthetic_demo ? 'DEMO / SYNTHETIC' : 'REAL OPERATOR INPUT'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-slate-500 block">Grouping Clarity:</span>
                    <span className="text-emerald-400 font-bold">{item.q1_grouping_clarity} / 5</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Traceability:</span>
                    <span className="text-sky-400 font-bold">{item.q3_traceability_score} / 5</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Topology Graph:</span>
                    <span className="text-purple-400 font-bold">{item.q4_dependency_graph_utility} / 5</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Effort Reduction:</span>
                    <span className="text-amber-400 font-bold">~{item.q6_effort_reduction_pct}%</span>
                  </div>
                </div>

                <div className="text-xs space-y-1.5">
                  <p className="text-slate-300">
                    <strong className="text-slate-400 font-mono text-[11px]">Confusing elements: </strong>
                    {item.q7_confusing_parts}
                  </p>
                  <p className="text-slate-300">
                    <strong className="text-slate-400 font-mono text-[11px]">Suggested improvements: </strong>
                    {item.q8_suggested_improvements}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
