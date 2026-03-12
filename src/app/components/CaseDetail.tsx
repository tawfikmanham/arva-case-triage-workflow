import { useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Copy,
  ExternalLink,
  File,
  FileImage,
  FileText,
  Pause,
  Save,
  ShieldAlert,
  Upload,
  ThumbsDown,
  ThumbsUp,
  X,
  XCircle,
} from 'lucide-react';
import { cases, statusLabels } from '../data/cases';
import type { Signal } from '../data/cases';
import { AppFooter } from './AppFooter';

type DecisionAction = 'close_case' | 'escalate' | 'request_information' | 'pause_review';

type SourceMeta = {
  name: string;
  trust: 'High' | 'Medium' | 'Low';
  available: boolean;
};

type SignalMeta = {
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  confidence: number;
  summary: string;
  explanation: string;
  sourceCount: number;
  evidence: string[];
  sources: SourceMeta[];
};

type AttachmentItem = {
  id: string;
  name: string;
  linkedSignal?: Signal;
};

type InvestigationTab = 'evidence' | 'communications' | 'similar_cases';

const decisionActions: { key: DecisionAction; label: string }[] = [
  { key: 'close_case', label: 'Close case' },
  { key: 'escalate', label: 'Escalate' },
  { key: 'request_information', label: 'Request information' },
  { key: 'pause_review', label: 'Pause review' },
];

const priorDecisions = [
  { date: '2025-09-14', decision: 'Cleared' },
  { date: '2025-06-02', decision: 'Escalated' },
];

const communicationThread = [
  {
    id: 'c1',
    actor: 'Nora Chen',
    role: 'Compliance Lead',
    channel: 'Internal note',
    timestamp: '2026-03-12 09:12',
    message: 'Ownership structure changed last quarter. Validate latest registry extract before closure.',
  },
  {
    id: 'c2',
    actor: 'Ravi Singh',
    role: 'Relationship Manager',
    channel: 'Client email',
    timestamp: '2026-03-12 08:46',
    message: 'Client provided updated UBO declaration and asked for expedited review due to payment delays.',
  },
  {
    id: 'c3',
    actor: 'Amina Yusuf',
    role: 'AML Analyst',
    channel: 'Case note',
    timestamp: '2026-03-11 17:29',
    message: 'Name match score remains high, but adverse media source reliability is mixed. Pending corroboration.',
  },
];

const similarCases = [
  {
    id: 'AML-2025-4012',
    entity: 'Eastern Harbor Logistics',
    outcome: 'Escalated',
    risk: 82,
    resolutionTime: '4h 20m',
    reason: 'Name match + UBO mismatch + high-risk corridor routing.',
    rationale: 'Escalated due to ownership discrepancy confirmed by registry extract.',
  },
  {
    id: 'AML-2025-3771',
    entity: 'Meridian Capital Partners',
    outcome: 'Request information',
    risk: 76,
    resolutionTime: '2h 05m',
    reason: 'Adverse media cluster with low-confidence primary source.',
    rationale: 'Requested supporting documents before final adverse-media determination.',
  },
  {
    id: 'AML-2025-3298',
    entity: 'Pacific Rim Commodities Ltd',
    outcome: 'Cleared',
    risk: 68,
    resolutionTime: '1h 40m',
    reason: 'Initial fuzzy name match later disproven by identifier mismatch.',
    rationale: 'Cleared after strong counter-evidence and verified registry alignment.',
  },
];

const signalCatalog: Record<Signal, SignalMeta> = {
  'Name Match': {
    severity: 'High',
    confidence: 92,
    summary: 'Name closely matches a sanctions listing.',
    explanation: 'Canonicalized name and alias overlap exceed direct-review threshold.',
    sourceCount: 2,
    evidence: ['Alias overlap 0.92', 'Country and business class aligned'],
    sources: [
      { name: 'OFAC SDN', trust: 'High', available: true },
      { name: 'EU Consolidated', trust: 'High', available: true },
    ],
  },
  'Country Risk': {
    severity: 'High',
    confidence: 84,
    summary: 'Jurisdiction is policy-tagged as high risk.',
    explanation: 'Country policy triggered enhanced due diligence requirement.',
    sourceCount: 2,
    evidence: ['Jurisdiction flagged in policy map', 'Cross-border rule triggered'],
    sources: [
      { name: 'FATF', trust: 'High', available: true },
      { name: 'Internal Policy', trust: 'High', available: true },
    ],
  },
  'Adverse Media': {
    severity: 'Medium',
    confidence: 74,
    summary: 'Recent media links entity to regulatory concerns.',
    explanation: 'Entity resolution returned multiple relevant adverse records.',
    sourceCount: 3,
    evidence: ['Investigation mention in article', 'Repeated reference in two outlets'],
    sources: [
      { name: 'Reuters', trust: 'High', available: true },
      { name: 'Dow Jones', trust: 'High', available: true },
      { name: 'Regional Feed', trust: 'Low', available: false },
    ],
  },
  PEP: {
    severity: 'High',
    confidence: 78,
    summary: 'Ownership graph links to a politically exposed person.',
    explanation: 'Control chain maps to active PEP profile.',
    sourceCount: 2,
    evidence: ['UBO linkage to PEP profile', 'Role period overlaps account activity'],
    sources: [
      { name: 'World-Check', trust: 'High', available: true },
      { name: 'OpenSanctions', trust: 'Medium', available: true },
    ],
  },
  'Sanctions Hit': {
    severity: 'Critical',
    confidence: 95,
    summary: 'Direct sanctions hit on name and identifiers.',
    explanation: 'Matching logic exceeded direct-hit threshold across multiple keys.',
    sourceCount: 2,
    evidence: ['Name and alias matched', 'Registry identifiers aligned'],
    sources: [
      { name: 'OFAC SDN', trust: 'High', available: true },
      { name: 'UN Sanctions', trust: 'High', available: true },
    ],
  },
  'UBO Mismatch': {
    severity: 'High',
    confidence: 86,
    summary: 'Declared ownership differs from registry record.',
    explanation: 'Submitted UBO data conflicts with latest registry extraction.',
    sourceCount: 2,
    evidence: ['Declared 25% vs registry 51%', 'Missing holding layer in declaration'],
    sources: [
      { name: 'Registry Extract', trust: 'High', available: true },
      { name: 'UBO Form', trust: 'Medium', available: true },
    ],
  },
  'High Volume': {
    severity: 'Medium',
    confidence: 69,
    summary: 'Transaction volume materially exceeds peer baseline.',
    explanation: '30-day rolling volume is above expected segment threshold.',
    sourceCount: 2,
    evidence: ['3.1x segment median', 'Spike pattern in recent counterparties'],
    sources: [
      { name: 'Internal Txn Data', trust: 'High', available: true },
      { name: 'Peer Model', trust: 'Medium', available: true },
    ],
  },
  'Shell Indicator': {
    severity: 'Medium',
    confidence: 72,
    summary: 'Entity profile resembles shell-company traits.',
    explanation: 'No operating footprint and layered ownership pattern detected.',
    sourceCount: 2,
    evidence: ['Address reused across multiple entities', 'No employee footprint'],
    sources: [
      { name: 'Business Registry', trust: 'High', available: true },
      { name: 'Address Intelligence', trust: 'Medium', available: true },
    ],
  },
};

function riskTone(score: number) {
  if (score >= 85) return 'bg-[#FEE2E2] text-[#991B1B]';
  if (score >= 70) return 'bg-[#FFF7ED] text-[#9A3412]';
  if (score >= 45) return 'bg-[#EFF6FF] text-[#1E40AF]';
  return 'bg-[#F0FDF4] text-[#166534]';
}

function sourceTone(level: SourceMeta['trust']) {
  if (level === 'High') return 'bg-[#F0FDF4] text-[#166534]';
  if (level === 'Medium') return 'bg-[#EFF6FF] text-[#1E40AF]';
  return 'bg-[#F3F4F6] text-[#6B7280]';
}

export function CaseDetail() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const caseData = cases.find((c) => c.id === caseId) || cases[0];
  const backTarget = location.state?.from === 'duplicates' ? '/duplicates' : '/';

  const [selectedDecision, setSelectedDecision] = useState<DecisionAction | null>(null);
  const [activeInvestigationTab, setActiveInvestigationTab] = useState<InvestigationTab>('evidence');
  const [rationale, setRationale] = useState('');
  const [selectedEvidence, setSelectedEvidence] = useState<Set<string>>(new Set());
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [isDragOverAttachments, setIsDragOverAttachments] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const signalFileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingSignalAttachment, setPendingSignalAttachment] = useState<Signal | null>(null);
  const [expandedSignal, setExpandedSignal] = useState<Signal | null>(caseData.signals[0] ?? null);
  const [reviewedSignals, setReviewedSignals] = useState<Set<Signal>>(new Set());
  const [isPaused, setIsPaused] = useState(false);
  const [isDraftSaved, setIsDraftSaved] = useState(false);
  const [showReviewDuplicatesPrompt, setShowReviewDuplicatesPrompt] = useState(false);
  const [recommendationFlagged, setRecommendationFlagged] = useState(false);
  const [recommendationFeedback, setRecommendationFeedback] = useState<'up' | 'down' | null>(null);
  const [duplicateDiscovered, setDuplicateDiscovered] = useState(false);

  const duplicateLikelyCount = Math.max(caseData.duplicateCount, 2);
  const aiConfidence = caseData.evidenceStrength === 'high' ? 87 : caseData.evidenceStrength === 'medium' ? 73 : 58;
  const recommendedDecision: DecisionAction = caseData.riskScore >= 80 ? 'escalate' : 'request_information';

  const slaRatio = caseData.slaMinutesRemaining / caseData.slaTotalMinutes;
  const isOverdue = caseData.slaMinutesRemaining <= 0;
  const isSlaRisk = !isOverdue && slaRatio <= 0.15;
  const hasConflictingEvidence = caseData.signals.includes('Name Match') && caseData.signals.includes('UBO Mismatch');
  const hasMissingEvidence = caseData.evidenceStrength === 'low';
  const hasSourceOutage = caseData.signals.some((s) => signalCatalog[s].sources.some((src) => !src.available));
  const hasClosePermission = caseData.priority !== 'critical';

  const relatedCases = useMemo(() => {
    if (caseData.duplicateGroupId) {
      return cases.filter((c) => c.duplicateGroupId === caseData.duplicateGroupId && c.id !== caseData.id).slice(0, 2);
    }
    return cases.filter((c) => c.id !== caseData.id && c.entityName.split(' ')[0] === caseData.entityName.split(' ')[0]).slice(0, 2);
  }, [caseData]);

  const decisionLabel = decisionActions.find((d) => d.key === selectedDecision)?.label ?? 'None';
  const rationaleMinChars = 1;
  const rationaleValid = rationale.trim().length >= rationaleMinChars;
  const hasEvidence = selectedEvidence.size > 0;
  const hasPermission = !selectedDecision || selectedDecision !== 'close_case' || hasClosePermission;
  const requiresEvidence = Boolean(selectedDecision && selectedDecision !== 'escalate');
  const evidenceSatisfied = !requiresEvidence || hasEvidence;
  const submitEnabled = Boolean(selectedDecision && rationaleValid && evidenceSatisfied && hasPermission);
  const slaLabel = isOverdue ? 'Overdue' : `${Math.max(caseData.slaMinutesRemaining, 0)}m left`;

  const appendAttachments = (files: FileList | File[], linkedSignal?: Signal) => {
    const next = Array.from(files)
      .filter((f) => f.name)
      .map((f, idx) => ({
        id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 8)}`,
        name: f.name,
        linkedSignal,
      }));
    if (next.length === 0) return;
    setAttachments((prev) => [...prev, ...next]);
    if (linkedSignal) {
      const evidenceKey = `${linkedSignal} evidence`;
      setSelectedEvidence((prev) => {
        const updated = new Set(prev);
        updated.add(evidenceKey);
        return updated;
      });
    }
  };

  const attachmentIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext && ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
      return <FileImage className="w-3.5 h-3.5 text-[#6B7280]" />;
    }
    if (ext && ['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext)) {
      return <FileText className="w-3.5 h-3.5 text-[#6B7280]" />;
    }
    return <File className="w-3.5 h-3.5 text-[#6B7280]" />;
  };

  const warningRows = [
    isOverdue ? { tone: 'text-[#991B1B]', text: '• SLA breach. Escalation path required.' } : null,
    isSlaRisk ? { tone: 'text-[#9A3412]', text: '• SLA at risk. Remaining time is below threshold.' } : null,
    hasConflictingEvidence ? { tone: 'text-[#1E3A8A]', text: '• Conflicting evidence detected (Name Match vs UBO Mismatch).' } : null,
    hasSourceOutage ? { tone: 'text-[#6B7280]', text: '• Data source unavailable for part of evidence set.' } : null,
    hasMissingEvidence ? { tone: 'text-[#6B7280]', text: '• Missing evidence quality. Consider Request information.' } : null,
    recommendationFlagged ? { tone: 'text-[#374151]', text: '• AI recommendation flagged by analyst.' } : null,
    isPaused ? { tone: 'text-[#6B7280]', text: '• Review paused. Resume from current step.' } : null,
    !hasPermission ? { tone: 'text-[#991B1B]', text: '• Insufficient permissions for selected decision.' } : null,
  ].filter(Boolean) as { tone: string; text: string }[];

  return (
    <div className="flex-1 min-w-0 h-full overflow-hidden bg-[#F5F5F5] flex flex-col">
      <div className="sticky top-0 z-20 bg-white border-b border-[#E6E8EC]">
        <div className="px-6 py-3">
          <div className="w-full flex items-center gap-3">
            <button
              onClick={() => navigate(backTarget)}
              className="inline-flex items-center gap-1.5 text-[#6B7280] hover:text-[#1A1E21]"
              style={{ fontSize: '12px' }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="h-4 w-px bg-[#E5E7EB]" />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[#1A1E21] truncate" style={{ fontSize: '15px', fontWeight: 600 }}>{caseData.entityName}</span>
                  <span className="text-[#9CA3AF]" style={{ fontSize: '12px' }}>{caseData.id}</span>
                </div>
              </div>

            <button
              onClick={() => setIsDraftSaved(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#E5E7EB] text-[#6B7280] hover:text-[#1A1E21]"
              style={{ fontSize: '12px', fontWeight: 500 }}
            >
              <Save className="w-3.5 h-3.5" />
              Save draft
            </button>
            <button
              onClick={() => setIsPaused((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border ${
                isPaused ? 'border-[#E17100] text-[#9A3412] bg-[#FFF7ED]' : 'border-[#E5E7EB] text-[#6B7280]'
              }`}
              style={{ fontSize: '12px', fontWeight: 500 }}
            >
              <Pause className="w-3.5 h-3.5" />
              {isPaused ? 'Resume' : 'Pause'}
            </button>

            <div
              className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border ${
                isOverdue
                  ? 'border-[#FCA5A5] bg-[#FEE2E2] text-[#991B1B]'
                  : isSlaRisk
                    ? 'border-[#FDBA74] bg-[#FFF7ED] text-[#9A3412]'
                    : 'border-[#E5E7EB] bg-white text-[#6B7280]'
              }`}
              style={{ fontSize: '12px', fontWeight: 600 }}
            >
              <Clock3 className="w-3.5 h-3.5" />
              {slaLabel}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
        <div className="flex-1">
          <div className="mx-auto w-full max-w-[1440px] px-6 py-5 space-y-5">
            <div className="grid grid-cols-12 gap-6">
              <main className="col-span-12 xl:col-span-8 min-h-0 overflow-y-auto space-y-5">
                <section className="bg-white border border-[#E6E8EC] rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-[#9CA3AF]" style={{ fontSize: '11px', fontWeight: 600 }}>Entity</div>
                      <div className="text-[#1A1E21] mt-1" style={{ fontSize: '13px', fontWeight: 600 }}>{caseData.entityType}</div>
                      <div className="text-[#6B7280] mt-0.5" style={{ fontSize: '12px' }}>{caseData.country}</div>
                    </div>
                    <div>
                      <div className="text-[#9CA3AF]" style={{ fontSize: '11px', fontWeight: 600 }}>Case</div>
                      <div className="text-[#1A1E21] mt-1" style={{ fontSize: '13px', fontWeight: 600 }}>{caseData.caseType}</div>
                      <div className="text-[#6B7280] mt-0.5" style={{ fontSize: '12px' }}>Assignee: {caseData.assignedAnalyst ?? 'Unassigned'}</div>
                    </div>
                    <div>
                      <div className="text-[#9CA3AF]" style={{ fontSize: '11px', fontWeight: 600 }}>Related</div>
                      <div className="text-[#1A1E21] mt-1" style={{ fontSize: '13px', fontWeight: 600 }}>
                        {relatedCases.length > 0 ? `${relatedCases.length} linked cases` : 'No linked cases'}
                      </div>
                      <div className="text-[#6B7280] mt-0.5 truncate" style={{ fontSize: '12px' }}>
                        {relatedCases[0] ? relatedCases[0].id : 'No active linkage'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#9CA3AF]" style={{ fontSize: '11px', fontWeight: 600 }}>Prior Decisions</div>
                      <div className="text-[#1A1E21] mt-1" style={{ fontSize: '13px', fontWeight: 600 }}>{priorDecisions.length} records</div>
                      <div className="text-[#6B7280] mt-0.5" style={{ fontSize: '12px' }}>{priorDecisions[0].decision} on {priorDecisions[0].date}</div>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#EEF0F2] flex flex-wrap items-center gap-2">
                    <span className="inline-flex h-7 items-center rounded-md px-2.5 bg-[#EFF6FF] text-[#1E40AF]" style={{ fontSize: '11px', fontWeight: 600 }}>
                      Status: {statusLabels[caseData.status]}
                    </span>
                    <span className={`inline-flex h-7 items-center rounded-md px-2.5 ${riskTone(caseData.riskScore)}`} style={{ fontSize: '11px', fontWeight: 600 }}>
                      Risk: {caseData.riskScore}
                    </span>
                    <button
                      onClick={() => navigate('/duplicates')}
                      className="inline-flex h-7 items-center gap-1 rounded-md px-2.5 bg-[#EFF6FF] text-[#1E40AF]"
                      style={{ fontSize: '11px', fontWeight: 600 }}
                    >
                      <Copy className="w-3 h-3" />
                      Duplicates: {duplicateLikelyCount}
                    </button>
                  </div>
                </section>
                {duplicateDiscovered && (
                  <section className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[#1E3A8A]" style={{ fontSize: '12px', fontWeight: 700 }}>
                          Duplicate case detected
                        </div>
                        <div className="text-[#1E40AF]" style={{ fontSize: '11px' }}>
                          Review grouped duplicates before final decision.
                        </div>
                      </div>
                      <button
                        onClick={() => setShowReviewDuplicatesPrompt(true)}
                        className="inline-flex items-center gap-1 px-2 py-1 border border-[#BFDBFE] rounded-md text-[#1E40AF] bg-white"
                        style={{ fontSize: '11px', fontWeight: 600 }}
                      >
                        <Copy className="w-3 h-3" />
                        Review duplicates
                      </button>
                    </div>
                  </section>
                )}
                {warningRows.length > 0 && (
                  <section className="bg-white border border-[#E6E8EC] rounded-lg p-4">
                    <div className="text-[#1A1E21] mb-2" style={{ fontSize: '13px', fontWeight: 600 }}>Review Warnings</div>
                    <div className="space-y-2">
                      {warningRows.map((row) => (
                        <div key={row.text} className={row.tone} style={{ fontSize: '12px' }}>{row.text}</div>
                      ))}
                    </div>
                  </section>
                )}
                <section className="bg-white border border-[#E6E8EC] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3 min-h-[28px]">
                    <h2 className="text-[#1A1E21]" style={{ fontSize: '14px', fontWeight: 600 }}>Investigation Workspace</h2>
                    <button
                      onClick={() => {
                        if (activeInvestigationTab !== 'evidence') return;
                        setDuplicateDiscovered(true);
                      }}
                      className={`inline-flex items-center gap-1 px-2 py-1 border border-[#E5E7EB] rounded-md text-[#6B7280] transition-opacity ${
                        activeInvestigationTab === 'evidence' ? 'opacity-100' : 'opacity-0 pointer-events-none'
                      }`}
                      style={{ fontSize: '11px' }}
                      aria-hidden={activeInvestigationTab !== 'evidence'}
                      tabIndex={activeInvestigationTab === 'evidence' ? 0 : -1}
                    >
                      <Copy className="w-3 h-3" />
                      Duplicate discovered
                    </button>
                  </div>

                  <div
                    className="mb-3 flex items-center gap-1 border-b border-[#E5E7EB]"
                    role="tablist"
                    aria-label="Investigation tabs"
                  >
                    <button
                      onClick={() => setActiveInvestigationTab('evidence')}
                      role="tab"
                      aria-selected={activeInvestigationTab === 'evidence'}
                      className={`px-2.5 py-2 -mb-px border-b-2 ${
                        activeInvestigationTab === 'evidence'
                          ? 'border-[#023547] text-[#023547]'
                          : 'border-transparent text-[#6B7280] hover:text-[#1A1E21]'
                      }`}
                      style={{ fontSize: '11px', fontWeight: 600 }}
                    >
                      Signals and Evidence
                    </button>
                    <button
                      onClick={() => setActiveInvestigationTab('communications')}
                      role="tab"
                      aria-selected={activeInvestigationTab === 'communications'}
                      className={`px-2.5 py-2 -mb-px border-b-2 ${
                        activeInvestigationTab === 'communications'
                          ? 'border-[#023547] text-[#023547]'
                          : 'border-transparent text-[#6B7280] hover:text-[#1A1E21]'
                      }`}
                      style={{ fontSize: '11px', fontWeight: 600 }}
                    >
                      Communications
                    </button>
                    <button
                      onClick={() => setActiveInvestigationTab('similar_cases')}
                      role="tab"
                      aria-selected={activeInvestigationTab === 'similar_cases'}
                      className={`px-2.5 py-2 -mb-px border-b-2 ${
                        activeInvestigationTab === 'similar_cases'
                          ? 'border-[#023547] text-[#023547]'
                          : 'border-transparent text-[#6B7280] hover:text-[#1A1E21]'
                      }`}
                      style={{ fontSize: '11px', fontWeight: 600 }}
                    >
                      Similar Cases
                    </button>
                  </div>

                  {activeInvestigationTab === 'evidence' && (
                    <div className="space-y-3">
                      {caseData.signals.map((signal) => {
                        const meta = signalCatalog[signal];
                        const isOpen = expandedSignal === signal;
                        const reviewed = reviewedSignals.has(signal);
                        const evidenceKey = `${signal} evidence`;
                        const linkedCount = attachments.filter((file) => file.linkedSignal === signal).length;
                        const linkedFiles = attachments.filter((file) => file.linkedSignal === signal);

                        return (
                          <div key={signal} className="border border-[#E5E7EB] rounded-lg overflow-hidden bg-white">
                            <button
                              onClick={() => setExpandedSignal(isOpen ? null : signal)}
                              className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-[#FAFBFC]"
                            >
                              {isOpen ? (
                                <ChevronDown className="w-4 h-4 text-[#6B7280] self-start mt-0.5" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-[#6B7280] self-start mt-0.5" />
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[#1A1E21]" style={{ fontSize: '13px', fontWeight: 600 }}>{signal}</span>
                                  <span className="px-1.5 py-0.5 rounded bg-[#FFF7ED] text-[#9A3412]" style={{ fontSize: '10px', fontWeight: 600 }}>{meta.severity}</span>
                                  <span className="px-1.5 py-0.5 rounded bg-[#EFF6FF] text-[#1E40AF]" style={{ fontSize: '10px', fontWeight: 600 }}>{meta.confidence}%</span>
                                  <span className="text-[#9CA3AF]" style={{ fontSize: '11px' }}>{meta.sourceCount} sources</span>
                                </div>
                                <div className="text-[#6B7280] mt-1" style={{ fontSize: '12px' }}>{meta.summary}</div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReviewedSignals((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(signal)) next.delete(signal);
                                    else next.add(signal);
                                    return next;
                                  });
                                }}
                                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 border ${
                                  reviewed
                                    ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]'
                                    : 'border-[#E5E7EB] bg-white text-[#6B7280] hover:text-[#1A1E21]'
                                }`}
                                style={{ fontSize: '10px', fontWeight: 600 }}
                              >
                                {reviewed ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3" />
                                    Reviewed
                                  </>
                                ) : (
                                  'Mark reviewed'
                                )}
                              </button>
                            </button>

                            {isOpen && (
                              <div className="border-t border-[#E5E7EB] px-4 py-4 bg-[#FCFDFE]">
                                <p className="text-[#374151]" style={{ fontSize: '12px', lineHeight: '1.5' }}>{meta.explanation}</p>
                                <div className="mt-3 space-y-1">
                                  {meta.evidence.map((line) => (
                                    <div key={line} className="text-[#6B7280]" style={{ fontSize: '12px' }}>• {line}</div>
                                  ))}
                                </div>
                                <div className="mt-3 grid sm:grid-cols-2 gap-2">
                                  {meta.sources.map((src) => (
                                    <div key={src.name} className="border border-[#E5E7EB] rounded-md px-2 py-2 flex items-center justify-between">
                                      <div>
                                        <div className="text-[#1A1E21]" style={{ fontSize: '11px', fontWeight: 600 }}>{src.name}</div>
                                        <span className={`inline-flex mt-1 px-1.5 py-0.5 rounded ${sourceTone(src.trust)}`} style={{ fontSize: '10px', fontWeight: 600 }}>
                                          {src.trust} trust
                                        </span>
                                      </div>
                                      {src.available ? (
                                        <button className="text-[#1E40AF]"><ExternalLink className="w-3.5 h-3.5" /></button>
                                      ) : (
                                        <span className="text-[#9CA3AF]" style={{ fontSize: '10px' }}>Outage</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                <div className="mt-3 flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      setPendingSignalAttachment(signal);
                                      signalFileInputRef.current?.click();
                                    }}
                                    className="px-2 py-1 rounded-md border border-[#E5E7EB] text-[#6B7280]"
                                    style={{ fontSize: '11px' }}
                                  >
                                    {linkedCount > 0 ? `Add documents (${linkedCount})` : 'Attach documents'}
                                  </button>
                                </div>
                                {linkedFiles.length > 0 && (
                                  <div className="mt-2 space-y-1.5">
                                    {linkedFiles.map((file) => (
                                      <div key={file.id} className="flex items-center justify-between bg-white border border-[#E5E7EB] rounded px-2 py-1">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          {attachmentIcon(file.name)}
                                          <span className="text-[#1A1E21] truncate" style={{ fontSize: '11px' }}>
                                            {file.name}
                                          </span>
                                        </div>
                                        <button
                                          onClick={() => {
                                            setAttachments((prev) => {
                                              const next = prev.filter((item) => item.id !== file.id);
                                              const hasRemainingForSignal = next.some((item) => item.linkedSignal === signal);
                                              if (!hasRemainingForSignal) {
                                                setSelectedEvidence((prevEvidence) => {
                                                  const updated = new Set(prevEvidence);
                                                  updated.delete(evidenceKey);
                                                  return updated;
                                                });
                                              }
                                              return next;
                                            });
                                          }}
                                          className="inline-flex items-center justify-center text-[#9CA3AF] hover:text-[#6B7280]"
                                          aria-label="Remove linked attachment"
                                        >
                                          <XCircle className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {activeInvestigationTab === 'communications' && (
                    <div className="space-y-2">
                      {communicationThread.map((item) => (
                        <div key={item.id} className="border border-[#E5E7EB] rounded-md px-3 py-2.5 bg-[#FCFDFE]">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-[#1A1E21]" style={{ fontSize: '12px', fontWeight: 600 }}>
                              {item.actor} • {item.role}
                            </div>
                            <div className="text-[#9CA3AF]" style={{ fontSize: '10px' }}>{item.timestamp}</div>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="inline-flex h-5 items-center rounded px-1.5 bg-[#F3F4F6] text-[#6B7280]" style={{ fontSize: '10px', fontWeight: 600 }}>
                              {item.channel}
                            </span>
                          </div>
                          <p className="mt-1.5 text-[#4B5563]" style={{ fontSize: '12px', lineHeight: '1.5' }}>{item.message}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeInvestigationTab === 'similar_cases' && (
                    <div className="space-y-2">
                      {similarCases.map((item) => (
                        <div key={item.id} className="border border-[#E5E7EB] rounded-md px-3 py-2.5 bg-[#FCFDFE]">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="text-[#1A1E21]" style={{ fontSize: '12px', fontWeight: 600 }}>
                                {item.id} • {item.entity}
                              </div>
                              <div className="text-[#6B7280]" style={{ fontSize: '11px' }}>
                                Outcome: {item.outcome} • Risk {item.risk} • Resolved in {item.resolutionTime}
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 text-[#4B5563]" style={{ fontSize: '12px' }}>
                            <span style={{ fontWeight: 600 }}>Why similar:</span> {item.reason}
                          </div>
                          <div className="mt-1 text-[#6B7280]" style={{ fontSize: '11px' }}>
                            <span style={{ fontWeight: 600 }}>Prior rationale:</span> {item.rationale}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </main>

              <aside className="col-span-12 xl:col-span-4 self-start xl:sticky xl:top-0">
                <div className="bg-white border border-[#E6E8EC] rounded-lg p-4 space-y-4">
                  <section className="pb-3 border-b border-[#E5E7EB]">
                  <div className="flex items-center justify-between">
                    <div className="text-[#9CA3AF]" style={{ fontSize: '11px', fontWeight: 600 }}>AI RECOMMENDATION</div>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[#1A1E21]" style={{ fontSize: '13px', fontWeight: 600 }}>
                      {decisionActions.find((d) => d.key === recommendedDecision)?.label}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[#EFF6FF] text-[#1E40AF]" style={{ fontSize: '10px', fontWeight: 600 }}>
                      {aiConfidence}%
                    </span>
                  </div>
                  <p className="mt-1 text-[#6B7280]" style={{ fontSize: '12px', lineHeight: '1.45' }}>
                    Recommendation may be incorrect. Use analyst judgment.
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => setSelectedDecision(recommendedDecision)}
                      className="px-2 py-1 rounded-md border border-[#E5E7EB] text-[#6B7280]"
                      style={{ fontSize: '11px' }}
                    >
                      Apply AI decision
                    </button>
                    <div className="ml-auto inline-flex items-center gap-1">
                      <button
                        onClick={() => {
                          setRecommendationFeedback('up');
                          setRecommendationFlagged(false);
                        }}
                        className={`inline-flex items-center justify-center h-7 w-7 rounded-md border ${
                          recommendationFeedback === 'up'
                            ? 'border-[#166534] bg-[#F0FDF4] text-[#166534]'
                            : 'border-[#E5E7EB] text-[#6B7280]'
                        }`}
                        aria-label="Thumbs up recommendation"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setRecommendationFeedback('down');
                          setRecommendationFlagged(true);
                        }}
                        className={`inline-flex items-center justify-center h-7 w-7 rounded-md border ${
                          recommendationFeedback === 'down'
                            ? 'border-[#9A3412] bg-[#FFF7ED] text-[#9A3412]'
                            : 'border-[#E5E7EB] text-[#6B7280]'
                        }`}
                        aria-label="Thumbs down recommendation"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </section>

                  <section className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-md p-2.5">
                <div className="text-[#9CA3AF] mb-1.5" style={{ fontSize: '11px', fontWeight: 600 }}>
                  CHECKLIST (START HERE)
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-[#6B7280]" style={{ fontSize: '11px' }}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${selectedDecision ? 'text-[#00A63E]' : 'text-[#D1D5DB]'}`} />
                    Decision selected
                  </div>
                  <div className="flex items-center gap-2 text-[#6B7280]" style={{ fontSize: '11px' }}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${rationaleValid ? 'text-[#00A63E]' : 'text-[#D1D5DB]'}`} />
                    Rationale complete
                  </div>
                  <div className="flex items-center gap-2 text-[#6B7280]" style={{ fontSize: '11px' }}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${selectedDecision && evidenceSatisfied ? 'text-[#00A63E]' : 'text-[#D1D5DB]'}`} />
                    {requiresEvidence ? 'Evidence linked' : 'Evidence optional for escalate'}
                  </div>
                  <div className="flex items-center gap-2 text-[#6B7280]" style={{ fontSize: '11px' }}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${hasPermission ? 'text-[#00A63E]' : 'text-[#D1D5DB]'}`} />
                    Permission verified
                  </div>
                </div>
              </section>

                  <section>
                <div className="text-[#9CA3AF] mb-2" style={{ fontSize: '11px', fontWeight: 600 }}>DECISION</div>
                <div className="relative">
                  <select
                    value={selectedDecision ?? ''}
                    onChange={(e) => setSelectedDecision((e.target.value || null) as DecisionAction | null)}
                    className="w-full appearance-none px-3 pr-10 py-2 rounded-md border border-[#E5E7EB] bg-white text-[#1A1E21] outline-none focus:border-[#023547]"
                    style={{ fontSize: '12px', fontWeight: 500 }}
                  >
                    <option value="">Select a decision</option>
                    {decisionActions.map((action) => (
                      <option key={action.key} value={action.key}>
                        {action.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#9CA3AF] pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
                {!hasPermission && (
                  <div className="mt-2 flex items-start gap-2 text-[#991B1B] bg-[#FEE2E2] border border-[#FCA5A5] rounded-md px-2 py-1.5">
                    <ShieldAlert className="w-4 h-4 mt-0.5" />
                    <span style={{ fontSize: '11px' }}>You do not have permission for this decision on critical cases.</span>
                  </div>
                )}
              </section>

                  <section>
                <div className="text-[#9CA3AF] mb-2" style={{ fontSize: '11px', fontWeight: 600 }}>RATIONALE *</div>
                <textarea
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                  placeholder="Explain your decision and reference evidence."
                  className="w-full min-h-[110px] resize-y bg-[#F9FAFB] border border-[#E5E7EB] rounded-md px-3 py-2 text-[#1A1E21] outline-none focus:border-[#023547]"
                  style={{ fontSize: '12px' }}
                />
                <div className="mt-1 flex items-center justify-between text-[#9CA3AF]" style={{ fontSize: '10px' }}>
                  <span />
                  <span>{rationale.trim().length} chars</span>
                </div>
              </section>

                  <section>
                <div className="text-[#9CA3AF] mb-2" style={{ fontSize: '11px', fontWeight: 600 }}>ATTACHMENTS (OPTIONAL)</div>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOverAttachments(true);
                  }}
                  onDragLeave={() => setIsDragOverAttachments(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOverAttachments(false);
                    appendAttachments(e.dataTransfer.files);
                  }}
                  className={`mb-3 rounded-md border border-dashed px-3 py-4 text-center transition-colors ${
                    isDragOverAttachments
                      ? 'border-[#1E40AF] bg-[#EFF6FF]'
                      : 'border-[#D1D5DB] bg-[#FAFBFC]'
                  }`}
                >
                  <Upload className="w-4 h-4 mx-auto text-[#6B7280]" />
                  <div className="mt-1 text-[#1A1E21]" style={{ fontSize: '11px', fontWeight: 600 }}>
                    Drag and drop files here
                  </div>
                  <div className="mt-0.5 text-[#9CA3AF]" style={{ fontSize: '10px' }}>
                    PDF, Word, images, or any supporting file
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 inline-flex items-center text-[#6B7280] hover:text-[#1A1E21]"
                    style={{ fontSize: '10px', fontWeight: 600 }}
                  >
                    Browse files
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) appendAttachments(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </div>
                <input
                  ref={signalFileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && pendingSignalAttachment) {
                      appendAttachments(e.target.files, pendingSignalAttachment);
                    }
                    setPendingSignalAttachment(null);
                    e.target.value = '';
                  }}
                />
                {attachments.length === 0 && <div className="text-[#9CA3AF] mb-2" style={{ fontSize: '11px' }}>No attachments.</div>}
                {attachments.map((file) => (
                  <div key={file.id} className="flex items-center justify-between bg-[#F9FAFB] border border-[#E5E7EB] rounded px-2 py-1 mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {attachmentIcon(file.name)}
                      <div className="min-w-0">
                        <div className="text-[#1A1E21] truncate" style={{ fontSize: '11px' }}>{file.name}</div>
                        {file.linkedSignal && (
                          <div className="text-[#9CA3AF]" style={{ fontSize: '10px' }}>
                            From {file.linkedSignal}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setAttachments((prev) => prev.filter((item) => item.id !== file.id))}
                      className="inline-flex items-center justify-center text-[#9CA3AF] hover:text-[#6B7280]"
                      aria-label="Remove attachment"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </section>

                  <section>
                <div className="text-[#9CA3AF] mb-2" style={{ fontSize: '11px', fontWeight: 600 }}>
                  EVIDENCE REFERENCES {requiresEvidence ? '*' : ''}
                </div>
                <div className="space-y-1.5">
                  {caseData.signals.map((signal) => {
                    const key = `${signal} evidence`;
                    return (
                      <label key={key} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedEvidence.has(key)}
                          onChange={(e) => {
                            setSelectedEvidence((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(key);
                              else next.delete(key);
                              return next;
                            });
                          }}
                          className="accent-[#023547]"
                        />
                        <span className="text-[#6B7280]" style={{ fontSize: '11px' }}>{key}</span>
                      </label>
                    );
                  })}
                </div>
                {requiresEvidence && !hasEvidence && (
                  <div className="mt-1 text-[#E7000B]" style={{ fontSize: '10px' }}>
                    Select at least one evidence reference.
                  </div>
                )}
              </section>

                  <button
                    disabled={!submitEnabled}
                    className={`w-full py-2.5 rounded-md ${
                      submitEnabled ? 'bg-[#023547] text-white hover:bg-[#03465D]' : 'bg-[#EFEFEF] text-[#9CA3AF] cursor-not-allowed'
                    }`}
                    style={{ fontSize: '13px', fontWeight: 600 }}
                  >
                    Submit Decision
                  </button>
                  {!submitEnabled && (
                    <div className="text-[#9CA3AF]" style={{ fontSize: '10px' }}>
                      {requiresEvidence
                        ? 'Complete rationale, evidence, and permission checks to submit.'
                        : 'Complete rationale and permission checks to submit.'}
                    </div>
                  )}
                  <div className="text-[#9CA3AF]" style={{ fontSize: '10px' }}>
                    Selected decision: {decisionLabel}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
        <div className="px-6 pt-0 pb-4">
          <AppFooter />
        </div>
      </div>
      {showReviewDuplicatesPrompt && (
        <div
          className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center px-4"
          onClick={() => setShowReviewDuplicatesPrompt(false)}
        >
          <div
            className="w-full max-w-[420px] bg-white border border-[#E5E7EB] rounded-lg shadow-sm p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[#1A1E21]" style={{ fontSize: '14px', fontWeight: 600 }}>
              Open Duplicates?
            </div>
            <div className="mt-1 text-[#6B7280]" style={{ fontSize: '12px', lineHeight: '1.5' }}>
              Current review updates are not submitted yet.
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => {
                  setIsDraftSaved(true);
                  setShowReviewDuplicatesPrompt(false);
                  navigate('/duplicates');
                }}
                className="px-3 py-1.5 rounded-md border border-[#E5E7EB] text-[#6B7280] hover:text-[#1A1E21] hover:bg-[#FAFBFC]"
                style={{ fontSize: '12px', fontWeight: 600 }}
              >
                Save progress
              </button>
              <button
                onClick={() => {
                  setShowReviewDuplicatesPrompt(false);
                  navigate('/duplicates');
                }}
                className="px-3 py-1.5 rounded-md border border-[#E5E7EB] text-[#9A3412] bg-[#FFF7ED] hover:bg-[#FFEDD5]"
                style={{ fontSize: '12px', fontWeight: 600 }}
              >
                Discard changes
              </button>
            </div>
          </div>
        </div>
      )}
      {isDraftSaved && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-12 z-40">
          <div className="inline-flex min-w-[250px] items-center justify-between gap-2 bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] rounded-md px-3 py-2 shadow-sm">
            <span style={{ fontSize: '12px', fontWeight: 600 }}>Draft saved</span>
            <button
              onClick={() => setIsDraftSaved(false)}
              className="inline-flex items-center justify-center text-[#166534]/70 hover:text-[#166534]"
              aria-label="Dismiss draft saved message"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
