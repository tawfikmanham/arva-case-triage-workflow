import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft,
  FileText,
  Clock,
  User,
  Building2,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  MessageSquare,
  Paperclip,
  Copy,
  XCircle,
  Pause,
  History,
  ExternalLink,
} from 'lucide-react';
import { cases, statusLabels } from '../data/cases';
import type { CaseItem } from '../data/cases';
import { SlaTimer } from './SlaTimer';
import { SignalChip } from './SignalChip';

// Timeline data
const timelineEvents = [
  { time: '07:15', action: 'Alert triggered', detail: 'AML screening system flagged entity', type: 'system' as const },
  { time: '07:16', action: 'Auto-enrichment', detail: 'Company registry, sanctions lists, adverse media queried', type: 'system' as const },
  { time: '07:18', action: 'Risk score calculated', detail: 'Composite score generated from 4 signals', type: 'system' as const },
  { time: '07:20', action: 'Assigned to queue', detail: 'Priority routing based on SLA policy', type: 'system' as const },
];

const documents = [
  { name: 'Corporate Registry Extract', type: 'PDF', date: '2026-03-10' },
  { name: 'Sanctions Screening Report', type: 'PDF', date: '2026-03-11' },
  { name: 'Adverse Media Summary', type: 'HTML', date: '2026-03-11', unavailable: true },
  { name: 'UBO Declaration', type: 'PDF', date: '2025-11-20' },
];

const relatedCases = [
  { id: 'AML-2026-4872', entity: 'ACME LTD', status: 'new' as const, riskScore: 78 },
  { id: 'AML-2026-4873', entity: 'ACME Trading Corp', status: 'new' as const, riskScore: 71 },
  { id: 'AML-2025-3201', entity: 'ACME LTD', status: 'closed' as const, riskScore: 45 },
];

const priorDecisions = [
  { date: '2025-09-14', decision: 'Cleared', analyst: 'Marcus Reid', rationale: 'Name match only, no corroborating evidence found.' },
  { date: '2025-06-02', decision: 'Escalated', analyst: 'Sarah Chen', rationale: 'Country risk flagged during periodic review. Sent to L2 for enhanced due diligence.' },
];

const versionHistory = [
  { version: 'v1.0', time: '2026-03-11 08:12', note: 'Case created from AML alert' },
  { version: 'v1.1', time: '2026-03-11 08:34', note: 'Signals enriched (sanctions + adverse media)' },
  { version: 'v1.2', time: '2026-03-11 09:05', note: 'Analyst notes updated' },
];

type DecisionAction = 'clear' | 'escalate' | 'request_info' | 'mark_duplicate' | 'false_positive';

export function CaseDetail() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [selectedDecision, setSelectedDecision] = useState<DecisionAction | null>(null);
  const [rationale, setRationale] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<Set<string>>(new Set());
  const [attachments, setAttachments] = useState<string[]>([]);

  const caseData = cases.find((c) => c.id === caseId) || cases[0];
  const slaRatio = caseData.slaMinutesRemaining / caseData.slaTotalMinutes;
  const isOverdue = caseData.slaMinutesRemaining <= 0;
  const isSlaRisk = slaRatio <= 0.15;
  const isLowEvidence = caseData.evidenceStrength === 'low';
  const hasClosePermission = caseData.priority !== 'critical';
  const hasEscalatePermission = true;
  const hasConflictingEvidence = caseData.signals.includes('Name Match') && caseData.signals.includes('UBO Mismatch');
  const isEvidenceComplete = selectedEvidence.size > 0;
  const isDecisionReady = selectedDecision && rationale.length >= 20 && isEvidenceComplete;

  const decisionActions: { key: DecisionAction; label: string; icon: typeof CheckCircle2; color: string; bg: string }[] = [
    { key: 'clear', label: 'Clear', icon: CheckCircle2, color: '#00A63E', bg: '#F0FDF4' },
    { key: 'escalate', label: 'Escalate', icon: ArrowUpRight, color: '#E17100', bg: '#FFF7ED' },
    { key: 'request_info', label: 'Request Info', icon: MessageSquare, color: '#6381F5', bg: '#EFF6FF' },
    { key: 'mark_duplicate', label: 'Mark Duplicate', icon: Copy, color: '#6B7280', bg: '#F5F5F5' },
    { key: 'false_positive', label: 'False Positive', icon: XCircle, color: '#9CA3AF', bg: '#F5F5F5' },
  ];

  return (
    <div className="flex-1 min-w-0 h-screen overflow-hidden flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#EFEFEF] px-6 py-2.5 flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-[#6B7280] hover:text-[#1A1E21] transition-colors"
          style={{ fontSize: '13px' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Inbox
        </button>
        <span className="text-[#E5E7EB]">|</span>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#1A1E21' }}>{caseData.id}</span>
        <span className="text-[#9CA3AF]" style={{ fontSize: '13px' }}>\u00b7</span>
        <span style={{ fontSize: '14px', fontWeight: 500, color: '#1A1E21' }}>{caseData.entityName}</span>

        <div className="ml-auto flex items-center gap-3">
          <SlaTimer minutesRemaining={caseData.slaMinutesRemaining} totalMinutes={caseData.slaTotalMinutes} />
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border transition-colors ${
              isPaused
                ? 'bg-[#FFF7ED] border-[#E17100] text-[#E17100]'
                : 'bg-white border-[#EFEFEF] text-[#6B7280] hover:text-[#1A1E21]'
            }`}
            style={{ fontSize: '12px', fontWeight: 500 }}
          >
            {isPaused ? <History className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            {isPaused ? 'Resume' : 'Pause Review'}
          </button>
        </div>
      </div>

      {/* 3-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT -- Case metadata */}
        <div className="w-[280px] min-w-[280px] border-r border-[#EFEFEF] overflow-y-auto bg-white">
          <div className="p-4 space-y-5">
            {/* Entity info */}
            <section>
              <div className="text-[#9CA3AF] mb-2" style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.05em' }}>
                ENTITY INFORMATION
              </div>
              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <Building2 className="w-4 h-4 text-[#9CA3AF] mt-0.5 flex-shrink-0" />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#1A1E21' }}>{caseData.entityName}</div>
                    <div className="text-[#9CA3AF]" style={{ fontSize: '11px' }}>{caseData.entityType}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-[#9CA3AF] flex-shrink-0" />
                  <span style={{ fontSize: '13px', color: '#6B7280' }}>{caseData.country}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-[#9CA3AF] flex-shrink-0" />
                  <span style={{ fontSize: '13px', color: '#6B7280' }}>{caseData.createdAt.split('T')[0]}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <User className="w-4 h-4 text-[#9CA3AF] flex-shrink-0" />
                  <span style={{ fontSize: '13px', color: '#6B7280' }}>
                    {caseData.assignedAnalyst || 'Unassigned'}
                  </span>
                </div>
              </div>
            </section>

            <div className="border-t border-[#EFEFEF]" />

            {/* Case metadata */}
            <section>
              <div className="text-[#9CA3AF] mb-2" style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.05em' }}>
                CASE DETAILS
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#9CA3AF]" style={{ fontSize: '12px' }}>Type</span>
                  <span className="text-[#1A1E21]" style={{ fontSize: '12px', fontWeight: 500 }}>{caseData.caseType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9CA3AF]" style={{ fontSize: '12px' }}>Risk Score</span>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: caseData.riskScore >= 80 ? '#E7000B' : caseData.riskScore >= 60 ? '#E17100' : '#00A63E',
                    }}
                  >
                    {caseData.riskScore}/100
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9CA3AF]" style={{ fontSize: '12px' }}>Evidence</span>
                  <span className="text-[#1A1E21]" style={{ fontSize: '12px', fontWeight: 500 }}>
                    {caseData.evidenceStrength.charAt(0).toUpperCase() + caseData.evidenceStrength.slice(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9CA3AF]" style={{ fontSize: '12px' }}>Status</span>
                  <span className="text-[#1A1E21]" style={{ fontSize: '12px', fontWeight: 500 }}>
                    {statusLabels[caseData.status]}
                  </span>
                </div>
              </div>
            </section>

            <div className="border-t border-[#EFEFEF]" />

            {/* Related cases */}
            <section>
              <div className="text-[#9CA3AF] mb-2" style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.05em' }}>
                RELATED CASES
              </div>
              <div className="space-y-1.5">
                {relatedCases.map((rc) => (
                  <button
                    key={rc.id}
                    onClick={() => navigate(`/case/${rc.id}`)}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-md hover:bg-[#F5F5F5] transition-colors text-left"
                  >
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 500, color: '#1A1E21' }}>{rc.id}</div>
                      <div className="text-[#9CA3AF]" style={{ fontSize: '11px' }}>{rc.entity}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="px-1.5 py-0.5 rounded"
                        style={{
                          fontSize: '11px',
                          fontWeight: 500,
                          backgroundColor: rc.status === 'closed' ? '#F0FDF4' : '#EFF6FF',
                          color: rc.status === 'closed' ? '#166534' : '#1E40AF',
                        }}
                      >
                        {rc.status === 'closed' ? 'Closed' : 'New'}
                      </span>
                      <ExternalLink className="w-3 h-3 text-[#9CA3AF]" />
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <div className="border-t border-[#EFEFEF]" />

            {/* Prior decisions */}
            <section>
              <div className="text-[#9CA3AF] mb-2" style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.05em' }}>
                PRIOR DECISIONS
              </div>
              <div className="space-y-3">
                {priorDecisions.map((pd, i) => (
                  <div key={i} className="bg-[#F9FAFB] rounded-md p-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`px-1.5 py-0.5 rounded ${
                          pd.decision === 'Cleared' ? 'bg-[#F0FDF4] text-[#166534]' : 'bg-[#FFF7ED] text-[#9A3412]'
                        }`}
                        style={{ fontSize: '11px', fontWeight: 500 }}
                      >
                        {pd.decision}
                      </span>
                      <span className="text-[#9CA3AF]" style={{ fontSize: '11px' }}>{pd.date}</span>
                    </div>
                    <p className="text-[#6B7280] mt-1" style={{ fontSize: '11px', lineHeight: '1.4' }}>
                      {pd.rationale}
                    </p>
                    <span className="text-[#9CA3AF] mt-1 block" style={{ fontSize: '10px' }}>
                      by {pd.analyst}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* CENTER -- Evidence + timeline */}
        <div className="flex-1 min-w-0 overflow-y-auto bg-[#F5F5F5]">
          <div className="p-5 space-y-4">
            {/* Edge case banners */}
            {(isOverdue || isSlaRisk || isLowEvidence || isPaused || hasConflictingEvidence) && (
              <div className="space-y-2">
                {isOverdue && (
                  <div className="bg-[#FEE2E2] border border-[#FCA5A5] text-[#991B1B] rounded-md px-3 py-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>SLA overdue</span>
                    <span className="text-[#7F1D1D]" style={{ fontSize: '12px' }}>
                      Escalation required. This case has missed the SLA window.
                    </span>
                  </div>
                )}
                {!isOverdue && isSlaRisk && (
                  <div className="bg-[#FFF7ED] border border-[#FED7AA] text-[#9A3412] rounded-md px-3 py-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>SLA at risk</span>
                    <span className="text-[#9A3412]" style={{ fontSize: '12px' }}>
                      Prioritize decisioning to avoid breach.
                    </span>
                  </div>
                )}
                {isLowEvidence && (
                  <div className="bg-[#F5F5F5] border border-[#E5E7EB] text-[#6B7280] rounded-md px-3 py-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#9CA3AF]" />
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>Low evidence quality</span>
                    <span className="text-[#6B7280]" style={{ fontSize: '12px' }}>
                      Some sources are missing or weak. Consider requesting more info.
                    </span>
                  </div>
                )}
                {hasConflictingEvidence && (
                  <div className="bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E3A8A] rounded-md px-3 py-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>Conflicting evidence</span>
                    <span className="text-[#1E3A8A]" style={{ fontSize: '12px' }}>
                      UBO mismatch conflicts with name match. Verify ownership chain.
                    </span>
                  </div>
                )}
                {isPaused && (
                  <div className="bg-[#F9FAFB] border border-[#E5E7EB] text-[#6B7280] rounded-md px-3 py-2 flex items-center gap-2">
                    <Pause className="w-4 h-4" />
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>Review paused</span>
                    <span className="text-[#6B7280]" style={{ fontSize: '12px' }}>
                      Draft saved. Resume later without losing context.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Signals detected */}
            <div className="bg-white rounded-lg border border-[#EFEFEF] p-4">
              <div className="text-[#9CA3AF] mb-3" style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.05em' }}>
                SIGNALS DETECTED
              </div>
              <div className="flex flex-wrap gap-2">
                {caseData.signals.map((s) => (
                  <SignalChip key={s} signal={s} />
                ))}
              </div>

              {/* Signal details */}
              <div className="mt-4 space-y-3">
                {caseData.signals.map((signal) => (
                  <div key={signal} className="bg-[#F9FAFB] rounded-md p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#1A1E21' }}>{signal}</span>
                      <span
                        className="px-1.5 py-0.5 rounded bg-[#FEE2E2] text-[#991B1B]"
                        style={{ fontSize: '10px', fontWeight: 500 }}
                      >
                        Confidence: {caseData.evidenceStrength === 'high' ? '94%' : caseData.evidenceStrength === 'medium' ? '72%' : '45%'}
                      </span>
                    </div>
                    <p className="text-[#6B7280]" style={{ fontSize: '12px', lineHeight: '1.5' }}>
                      {signal === 'Name Match' && 'Entity name matches entry in consolidated sanctions list with fuzzy score 0.92. Manual verification recommended.'}
                      {signal === 'Country Risk' && `Jurisdiction ${caseData.country} is classified as high-risk by FATF. Enhanced due diligence required.`}
                      {signal === 'Adverse Media' && 'News articles from Reuters and Bloomberg reference entity in connection with regulatory investigation (2025).'}
                      {signal === 'PEP' && 'Entity linked to politically exposed person through beneficial ownership chain. Direct association confidence high.'}
                      {signal === 'Sanctions Hit' && 'Direct match found in OFAC SDN list. Entity name and country of registration align with designated party.'}
                      {signal === 'UBO Mismatch' && 'Declared ultimate beneficial owner differs from registry data. Discrepancy in ownership percentage (declared 25%, registry shows 51%).'}
                      {signal === 'Shell Indicator' && 'Entity exhibits shell company characteristics: no employees, registered agent address, circular ownership structure.'}
                      {signal === 'High Volume' && 'Transaction volume exceeds 3x the peer group median for the last 30 days. Pattern consistent with layering.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Documents */}
            <div className="bg-white rounded-lg border border-[#EFEFEF] p-4">
              <div className="text-[#9CA3AF] mb-3" style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.05em' }}>
                DOCUMENTS
              </div>
              <div className="space-y-1">
                {documents.map((doc, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                      doc.unavailable ? 'bg-[#F9FAFB] text-[#9CA3AF] cursor-not-allowed' : 'hover:bg-[#F9FAFB] cursor-pointer'
                    }`}
                  >
                    <FileText className={`w-4 h-4 flex-shrink-0 ${doc.unavailable ? 'text-[#D1D5DB]' : 'text-[#6381F5]'}`} />
                    <div className="flex-1">
                      <span style={{ fontSize: '13px', color: '#1A1E21' }}>{doc.name}</span>
                    </div>
                    <span className="text-[#9CA3AF]" style={{ fontSize: '11px' }}>{doc.type}</span>
                    <span className="text-[#9CA3AF]" style={{ fontSize: '11px' }}>{doc.date}</span>
                    {doc.unavailable ? (
                      <span className="text-[#D1D5DB]" style={{ fontSize: '11px' }}>Source unavailable</span>
                    ) : (
                      <Paperclip className="w-3.5 h-3.5 text-[#9CA3AF]" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Activity timeline */}
            <div className="bg-white rounded-lg border border-[#EFEFEF] p-4">
              <div className="text-[#9CA3AF] mb-3" style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.05em' }}>
                ACTIVITY TIMELINE
              </div>
              <div className="space-y-0">
                {timelineEvents.map((event, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-[#023547] mt-1.5 flex-shrink-0" />
                      {i < timelineEvents.length - 1 && (
                        <div className="w-px flex-1 bg-[#EFEFEF] my-1" />
                      )}
                    </div>
                    <div className="pb-4">
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#1A1E21' }}>{event.action}</span>
                        <span className="text-[#9CA3AF]" style={{ fontSize: '11px' }}>{event.time}</span>
                      </div>
                      <p className="text-[#6B7280] mt-0.5" style={{ fontSize: '12px' }}>{event.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT -- Decision panel */}
        <div className="w-[300px] min-w-[300px] border-l border-[#EFEFEF] overflow-y-auto bg-white">
          <div className="p-4 space-y-5">
            {/* Recommendation + duplicate detection */}
            <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-md p-3">
              <div className="text-[#9CA3AF] mb-2" style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.05em' }}>
                AI RECOMMENDATION
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#1A1E21]" style={{ fontSize: '13px', fontWeight: 600 }}>
                  Escalate
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[#FFF7ED] text-[#9A3412]" style={{ fontSize: '10px', fontWeight: 500 }}>
                  Confidence 72%
                </span>
              </div>
              <p className="text-[#6B7280] mt-1" style={{ fontSize: '12px' }}>
                High risk score with sanctions hit and adverse media. Review ownership chain before deciding.
              </p>
              <button
                className="mt-2 text-[#1E40AF] hover:text-[#1E3A8A] underline"
                style={{ fontSize: '11px' }}
              >
                Flag recommendation as incorrect
              </button>
            </div>

            <div className="bg-white border border-[#EFEFEF] rounded-md p-3">
              <div className="text-[#9CA3AF] mb-2" style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.05em' }}>
                DUPLICATE DETECTION
              </div>
              <div className="text-[#1A1E21]" style={{ fontSize: '12px', fontWeight: 600 }}>
                2 related cases may be duplicates
              </div>
              <p className="text-[#6B7280] mt-1" style={{ fontSize: '12px' }}>
                Matching entity name and address across recent alerts.
              </p>
              <button
                className="mt-2 text-[#1E40AF] hover:text-[#1E3A8A] underline"
                style={{ fontSize: '11px' }}
              >
                Review group
              </button>
            </div>

            <div>
              <div className="text-[#9CA3AF] mb-3" style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.05em' }}>
                DECISION
              </div>

              {/* Decision buttons */}
              <div className="space-y-1.5">
                {decisionActions.map((action) => (
                  <button
                    key={action.key}
                    onClick={() => setSelectedDecision(action.key)}
                    disabled={
                      (action.key === 'clear' || action.key === 'false_positive') && !hasClosePermission
                    }
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md border transition-all ${
                      selectedDecision === action.key
                        ? 'border-current ring-1 ring-current'
                        : 'border-[#EFEFEF] hover:border-[#D1D5DB]'
                    }`}
                    style={{
                      color: selectedDecision === action.key ? action.color : '#6B7280',
                      backgroundColor: selectedDecision === action.key ? action.bg : 'transparent',
                      opacity:
                        (action.key === 'clear' || action.key === 'false_positive') && !hasClosePermission ? 0.5 : 1,
                    }}
                  >
                    <action.icon className="w-4 h-4 flex-shrink-0" />
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{action.label}</span>
                  </button>
                ))}
              </div>
              {!hasClosePermission && (
                <div className="mt-2 text-[#9CA3AF]" style={{ fontSize: '11px' }}>
                  You don’t have permission to close or mark false positives on critical cases.
                </div>
              )}
            </div>

            {selectedDecision && (
              <>
                <div className="border-t border-[#EFEFEF]" />

                {/* Rationale */}
                <div>
                  <label
                    className="text-[#9CA3AF] block mb-2"
                    style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.05em' }}
                  >
                    RATIONALE <span className="text-[#E7000B]">*</span>
                  </label>
                  <textarea
                    value={rationale}
                    onChange={(e) => setRationale(e.target.value)}
                    placeholder="Provide rationale for this decision..."
                    className="w-full bg-[#F9FAFB] border border-[#EFEFEF] rounded-md px-3 py-2.5 text-[#1A1E21] placeholder:text-[#9CA3AF] outline-none focus:border-[#023547] resize-none transition-colors"
                    style={{ fontSize: '13px', minHeight: '100px' }}
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-[#9CA3AF]" style={{ fontSize: '10px' }}>
                      Minimum 20 characters
                    </span>
                    <span className="text-[#9CA3AF]" style={{ fontSize: '10px' }}>
                      {rationale.length} chars
                    </span>
                  </div>
                </div>

                {/* Evidence references */}
                <div>
                  <label
                    className="text-[#9CA3AF] block mb-2"
                    style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.05em' }}
                  >
                    EVIDENCE REFERENCES
                  </label>
                  <div className="space-y-1">
                    {documents.slice(0, 3).map((doc, i) => (
                      <label
                        key={i}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-[#F9FAFB] cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          className="rounded border-[#D1D5DB] accent-[#023547]"
                          checked={selectedEvidence.has(doc.name)}
                          onChange={(e) => {
                            setSelectedEvidence((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(doc.name);
                              else next.delete(doc.name);
                              return next;
                            });
                          }}
                        />
                        <span className="text-[#6B7280]" style={{ fontSize: '12px' }}>{doc.name}</span>
                      </label>
                    ))}
                  </div>
                  {!isEvidenceComplete && (
                    <div className="text-[#E7000B] mt-1" style={{ fontSize: '10px' }}>
                      Add at least one evidence reference.
                    </div>
                  )}
                </div>

                {/* Attachments */}
                <div>
                  <label
                    className="text-[#9CA3AF] block mb-2"
                    style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.05em' }}
                  >
                    ATTACHMENTS
                  </label>
                  <div className="space-y-2">
                    {attachments.length === 0 && (
                      <div className="text-[#9CA3AF]" style={{ fontSize: '11px' }}>
                        No attachments added.
                      </div>
                    )}
                    {attachments.map((name, i) => (
                      <div
                        key={`${name}-${i}`}
                        className="flex items-center justify-between bg-[#F9FAFB] border border-[#EFEFEF] rounded-md px-2.5 py-1.5"
                      >
                        <span className="text-[#1A1E21]" style={{ fontSize: '12px' }}>{name}</span>
                        <button
                          onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                          className="text-[#9CA3AF] hover:text-[#6B7280]"
                          style={{ fontSize: '11px' }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setAttachments((prev) => [...prev, 'Analyst note.pdf'])}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#E5E7EB] text-[#1A1E21] hover:bg-white"
                      style={{ fontSize: '11px', fontWeight: 500 }}
                    >
                      <Paperclip className="w-3 h-3" />
                      Add attachment
                    </button>
                  </div>
                </div>

                {/* Decision checklist */}
                <div className="bg-white border border-[#EFEFEF] rounded-md p-3">
                  <div className="text-[#9CA3AF] mb-2" style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.05em' }}>
                    DECISION CHECKLIST
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${selectedDecision ? 'text-[#00A63E]' : 'text-[#D1D5DB]'}`} />
                      <span className="text-[#6B7280]" style={{ fontSize: '11px' }}>Action selected</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${rationale.length >= 20 ? 'text-[#00A63E]' : 'text-[#D1D5DB]'}`} />
                      <span className="text-[#6B7280]" style={{ fontSize: '11px' }}>Rationale meets minimum length</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${isEvidenceComplete ? 'text-[#00A63E]' : 'text-[#D1D5DB]'}`} />
                      <span className="text-[#6B7280]" style={{ fontSize: '11px' }}>Evidence references attached</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${hasClosePermission ? 'text-[#00A63E]' : 'text-[#D1D5DB]'}`} />
                      <span className="text-[#6B7280]" style={{ fontSize: '11px' }}>Permission verified</span>
                    </div>
                  </div>
                </div>

                {/* Audit info */}
                <div className="bg-[#F9FAFB] rounded-md p-3">
                  <div className="text-[#9CA3AF] mb-1.5" style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.05em' }}>
                    AUDIT TRAIL
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[#9CA3AF]" style={{ fontSize: '11px' }}>Analyst</span>
                      <span className="text-[#1A1E21]" style={{ fontSize: '11px', fontWeight: 500 }}>Current User</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#9CA3AF]" style={{ fontSize: '11px' }}>Timestamp</span>
                      <span className="text-[#1A1E21]" style={{ fontSize: '11px', fontWeight: 500 }}>
                        {new Date().toISOString().split('T')[0]} {new Date().toTimeString().slice(0, 5)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#9CA3AF]" style={{ fontSize: '11px' }}>Review time</span>
                      <span className="text-[#1A1E21]" style={{ fontSize: '11px', fontWeight: 500 }}>2m 34s</span>
                    </div>
                  </div>
                </div>

                {/* Version history */}
                <div className="bg-white border border-[#EFEFEF] rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[#9CA3AF]" style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.05em' }}>
                      VERSION HISTORY
                    </span>
                    <span className="text-[#1A1E21]" style={{ fontSize: '10px', fontWeight: 600 }}>Current: v1.2</span>
                  </div>
                  <div className="space-y-2">
                    {versionHistory.map((v) => (
                      <div key={v.version} className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[#1A1E21]" style={{ fontSize: '11px', fontWeight: 600 }}>{v.version}</div>
                          <div className="text-[#6B7280]" style={{ fontSize: '11px' }}>{v.note}</div>
                        </div>
                        <div className="text-[#9CA3AF]" style={{ fontSize: '10px' }}>{v.time}</div>
                      </div>
                    ))}
                  </div>
                  <button
                    className="mt-2 text-[#1E40AF] hover:text-[#1E3A8A] underline"
                    style={{ fontSize: '11px' }}
                  >
                    View full history
                  </button>
                </div>

                {/* Submit */}
                <button
                  disabled={!isDecisionReady}
                  className={`w-full py-2.5 rounded-md transition-colors ${
                    isDecisionReady
                      ? 'bg-[#023547] text-white hover:bg-[#034b63]'
                      : 'bg-[#EFEFEF] text-[#9CA3AF] cursor-not-allowed'
                  }`}
                  style={{ fontSize: '13px', fontWeight: 600 }}
                >
                  Submit Decision
                </button>

                {/* Keyboard shortcut hint */}
                <div className="text-center">
                  <span className="text-[#9CA3AF]" style={{ fontSize: '10px' }}>
                    Press <kbd className="px-1.5 py-0.5 bg-[#EFEFEF] rounded text-[#6B7280]" style={{ fontSize: '10px' }}>Ctrl + Enter</kbd> to submit
                  </span>
                </div>
              </>
            )}

            {!selectedDecision && (
              <div className="bg-[#F9FAFB] rounded-md p-4 text-center">
                <AlertTriangle className="w-5 h-5 text-[#9CA3AF] mx-auto mb-2" />
                <p className="text-[#6B7280]" style={{ fontSize: '12px' }}>
                  Select a decision action above to proceed with this case.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
