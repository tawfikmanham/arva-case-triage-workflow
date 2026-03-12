import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { cases, statusLabels, type Priority } from '../data/cases';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { SlaTimer } from './SlaTimer';
import { SignalChip } from './SignalChip';
import { AppFooter } from './AppFooter';
import { useMergedGroups } from '../state/MergedGroupsContext';

type DuplicateGroup = {
  id: string;
  entityName: string;
  cases: typeof cases;
};

function groupDuplicates() {
  const map = new Map<string, DuplicateGroup>();
  for (const c of cases) {
    if (!c.duplicateGroupId) continue;
    const existing = map.get(c.duplicateGroupId);
    if (existing) {
      existing.cases.push(c);
    } else {
      map.set(c.duplicateGroupId, {
        id: c.duplicateGroupId,
        entityName: c.entityName,
        cases: [c],
      });
    }
  }
  return Array.from(map.values());
}

function RiskScoreBadge({ score }: { score: number }) {
  let color = '#00A63E';
  let bg = '#F0FDF4';
  if (score >= 80) { color = '#E7000B'; bg = '#FEE2E2'; }
  else if (score >= 60) { color = '#E17100'; bg = '#FFF7ED'; }
  else if (score >= 40) { color = '#6381F5'; bg = '#EFF6FF'; }

  return (
    <span
      className="inline-flex items-center justify-center w-9 h-6 rounded"
      style={{ backgroundColor: bg, color, fontSize: '12px', fontWeight: 600 }}
    >
      {score}
    </span>
  );
}

function StatusBadge({ status }: { status: typeof cases[number]['status'] }) {
  const config: Record<string, { bg: string; text: string }> = {
    new: { bg: '#EFF6FF', text: '#1E40AF' },
    in_review: { bg: '#FFF7ED', text: '#9A3412' },
    escalated: { bg: '#FEE2E2', text: '#991B1B' },
    pending_info: { bg: '#FEF3C7', text: '#92400E' },
    closed: { bg: '#F0FDF4', text: '#166534' },
  };
  const c = config[status];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded"
      style={{ backgroundColor: c.bg, color: c.text, fontSize: '11px', fontWeight: 500 }}
    >
      {statusLabels[status as keyof typeof statusLabels]}
    </span>
  );
}

function PriorityIndicator({ priority }: { priority: Priority }) {
  const config: Record<Priority, { color: string; bg: string; label: string }> = {
    critical: { color: '#E7000B', bg: '#E7000B', label: 'CRIT' },
    high: { color: '#E17100', bg: '#E17100', label: 'HIGH' },
    medium: { color: '#6381F5', bg: '#6381F5', label: 'MED' },
    low: { color: '#9CA3AF', bg: '#9CA3AF', label: 'LOW' },
  };
  const c = config[priority];
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.bg }} />
      <span style={{ color: c.color, fontSize: '11px', fontWeight: 600, letterSpacing: '0.03em' }}>
        {c.label}
      </span>
    </div>
  );
}

function groupSummary(group: DuplicateGroup) {
  const priorityOrder: Record<Priority, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  const topPriority = [...group.cases].sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])[0].priority;
  const highestRisk = Math.max(...group.cases.map((c) => c.riskScore));
  const earliestSla = Math.min(...group.cases.map((c) => c.slaMinutesRemaining));
  const topSignals = Array.from(
    new Set(group.cases.flatMap((c) => c.signals).slice(0, 3)),
  );
  const evidence = group.cases.some((c) => c.evidenceStrength === 'high')
    ? 'High'
    : group.cases.some((c) => c.evidenceStrength === 'medium')
    ? 'Medium'
    : 'Low';
  const statusSet = new Set(group.cases.map((c) => c.status));
  const status = statusSet.size === 1 ? statusLabels[group.cases[0].status] : 'Mixed';
  const analystSet = new Set(group.cases.map((c) => c.assignedAnalyst).filter(Boolean));
  const analyst = analystSet.size === 0 ? 'Unassigned' : analystSet.size === 1 ? Array.from(analystSet)[0] : 'Multiple';
  return { highestRisk, earliestSla, topSignals, evidence, status, analyst, priority: topPriority };
}

export function Duplicates() {
  const groups = useMemo(() => groupDuplicates(), []);
  const { mergedGroupIds, mergeGroup, unmergeGroup, mergeAllGroups } = useMergedGroups();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const allMerged = groups.length > 0 && groups.every((group) => mergedGroupIds.has(group.id));

  function toggleGroup(groupId: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  return (
    <div className="flex-1 min-w-0 h-full overflow-auto flex flex-col">
      <div className="sticky top-0 z-10 bg-[#F5F5F5] border-b border-[#EFEFEF]">
        <div className="px-6 py-3 flex items-center gap-6">
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#1A1E21' }}>Merge Duplicates</h1>
          <div className="text-[#6B7280]" style={{ fontSize: '12px' }}>
            {groups.length} duplicate groups detected
          </div>
          <button
            type="button"
            onClick={() => mergeAllGroups(groups.map((group) => group.id))}
            disabled={allMerged}
            className="ml-auto px-3 py-1.5 rounded-md border border-[#E5E7EB] text-[#0B5D6B] bg-white disabled:text-[#9CA3AF] disabled:bg-[#F9FAFB] disabled:cursor-not-allowed"
            style={{ fontSize: '12px', fontWeight: 600 }}
          >
            Merge all
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="px-6 py-6 flex-1">
          <div className="mx-auto w-full max-w-[1440px] bg-white rounded-lg border border-[#EFEFEF] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#EFEFEF] bg-[#FAFBFC]">
                  <th className="py-2 px-3 pl-4 text-left" style={{ fontSize: '11px', fontWeight: 500, color: '#6B7280', letterSpacing: '0.03em' }}>PRIORITY</th>
                  <th className="py-2 px-3 text-left" style={{ fontSize: '11px', fontWeight: 500, color: '#6B7280', letterSpacing: '0.03em' }}>SLA</th>
                  <th className="py-2 px-3">
                    <div className="flex justify-center" style={{ fontSize: '11px', fontWeight: 500, color: '#6B7280', letterSpacing: '0.03em' }}>RISK</div>
                  </th>
                  <th className="py-2 px-3 text-left" style={{ fontSize: '11px', fontWeight: 500, color: '#6B7280', letterSpacing: '0.03em' }}>ENTITY</th>
                  <th className="py-2 px-3 text-left" style={{ fontSize: '11px', fontWeight: 500, color: '#6B7280', letterSpacing: '0.03em' }}>SIGNALS</th>
                  <th className="py-2 px-3 text-center">
                    <div className="flex justify-center" style={{ fontSize: '11px', fontWeight: 500, color: '#6B7280', letterSpacing: '0.03em' }}>EVIDENCE</div>
                  </th>
                  <th className="py-2 px-3 text-left" style={{ fontSize: '11px', fontWeight: 500, color: '#6B7280', letterSpacing: '0.03em' }}>STATUS</th>
                  <th className="py-2 px-3 text-left" style={{ fontSize: '11px', fontWeight: 500, color: '#6B7280', letterSpacing: '0.03em' }}>ANALYST</th>
                  <th className="py-2 px-3 text-left" style={{ fontSize: '11px', fontWeight: 500, color: '#6B7280', letterSpacing: '0.03em' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => {
                const isExpanded = expandedGroups.has(group.id);
                const isMerged = mergedGroupIds.has(group.id);
                const summary = groupSummary(group);

                return (
                  <React.Fragment key={group.id}>
                    <tr
                      className={`border-b border-[#EFEFEF] cursor-pointer hover:bg-[#F9FAFB] ${isExpanded ? 'bg-[#F9FAFB]' : 'bg-white'}`}
                      onClick={() => toggleGroup(group.id)}
                    >
                      <td className="py-2 px-3 pl-4" style={{ width: '160px' }}>
                        <PriorityIndicator priority={summary.priority} />
                      </td>
                      <td className="py-2 px-2" style={{ width: '112px' }}>
                        <SlaTimer minutesRemaining={summary.earliestSla} totalMinutes={group.cases[0].slaTotalMinutes} compact />
                      </td>
                      <td className="py-2 px-2" style={{ width: '50px' }}>
                        <div className="flex justify-center">
                          <RiskScoreBadge score={summary.highestRisk} />
                        </div>
                      </td>
                      <td className="py-2 px-3" style={{ width: '180px' }}>
                        <div className="text-[#111827]" style={{ fontSize: '12px', fontWeight: 600 }}>{group.entityName}</div>
                        <div className="text-[#9CA3AF]" style={{ fontSize: '11px' }}>
                          {group.cases.length} cases
                        </div>
                      </td>
                      <td className="py-2 px-3" style={{ width: '260px' }}>
                        <div className="flex items-center gap-1">
                          {summary.topSignals.slice(0, 1).map((signal) => (
                            <SignalChip key={signal} signal={signal} />
                          ))}
                          {summary.topSignals.length > 1 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#F3F4F6] text-[#6B7280]" style={{ fontSize: '11px', fontWeight: 500 }}>
                              +{summary.topSignals.length - 1} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center" style={{ width: '80px' }}>
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: summary.evidence === 'High' ? '#F0FDF4' : summary.evidence === 'Medium' ? '#FFF7ED' : '#F5F5F5',
                            color: summary.evidence === 'High' ? '#166534' : summary.evidence === 'Medium' ? '#9A3412' : '#6B7280',
                            fontSize: '11px',
                            fontWeight: 500,
                          }}
                        >
                          {summary.evidence}
                        </span>
                      </td>
                      <td className="py-2 px-3" style={{ width: '100px' }}>
                        {summary.status === 'Mixed' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded" style={{ backgroundColor: '#F3F4F6', color: '#6B7280', fontSize: '11px', fontWeight: 500 }}>
                            Mixed
                          </span>
                        ) : (
                          <StatusBadge status={summary.status.toLowerCase().replace(' ', '_') as any} />
                        )}
                      </td>
                      <td className="py-2 px-3" style={{ width: '110px' }}>
                        <span className="text-[#6B7280]" style={{ fontSize: '11px' }}>{summary.analyst}</span>
                      </td>
                      <td className="py-2 px-3" style={{ width: '120px' }}>
                        <div className="flex items-center justify-between gap-2">
                          {!isMerged ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                mergeGroup(group.id);
                              }}
                              className="px-2.5 py-1 rounded-md border border-[#E5E7EB] text-[#6B7280] hover:text-[#0B5D6B]"
                              style={{ fontSize: '11px', fontWeight: 600 }}
                            >
                              Merge group
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                unmergeGroup(group.id);
                              }}
                              className="px-2.5 py-1 rounded-md border border-[#E5E7EB] text-[#6B7280] hover:text-[#0B5D6B]"
                              style={{ fontSize: '11px', fontWeight: 600 }}
                            >
                              Unmerge
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleGroup(group.id);
                            }}
                            className="px-2 py-1 rounded-md text-[#6B7280] hover:text-[#0B5D6B] hover:bg-[#F3F4F6]"
                            aria-label={isExpanded ? 'Collapse group' : 'Expand group'}
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && group.cases.map((c) => (
                      <tr
                        key={c.id}
                        className="bg-white border-b border-[#EFEFEF] hover:bg-[#F9FAFB] cursor-pointer"
                        onClick={() => navigate(`/case/${c.id}`, { state: { from: 'duplicates' } })}
                      >
                        <td className="py-2 px-3 pl-4" style={{ width: '160px' }}>
                          <div className="flex items-center gap-2">
                            <span className="w-3 border-l-2 border-b-2 border-[#E5E7EB] h-3 flex-shrink-0 -mt-2 ml-1" />
                            <span className="text-[#6B7280]" style={{ fontSize: '11px' }}>{c.id}</span>
                          </div>
                        </td>
                        <td className="py-2 px-2" style={{ width: '112px' }}>
                          <SlaTimer minutesRemaining={c.slaMinutesRemaining} totalMinutes={c.slaTotalMinutes} compact />
                        </td>
                        <td className="py-2 px-2" style={{ width: '50px' }}>
                          <div className="flex justify-center">
                            <RiskScoreBadge score={c.riskScore} />
                          </div>
                        </td>
                        <td className="py-2 px-3" style={{ width: '180px' }}>
                          <span className="text-[#6B7280]" style={{ fontSize: '12px' }}>{c.entityType} · {c.country}</span>
                        </td>
                        <td className="py-2 px-3" style={{ width: '260px' }}>
                          <div className="flex flex-wrap gap-1">
                            {c.signals.slice(0, 2).map((signal) => (
                              <SignalChip key={signal} signal={signal} />
                            ))}
                            {c.signals.length > 2 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#F3F4F6] text-[#6B7280]" style={{ fontSize: '11px', fontWeight: 500 }}>
                                +{c.signals.length - 2} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center" style={{ width: '80px' }}>
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded"
                            style={{
                              backgroundColor: c.evidenceStrength === 'high' ? '#F0FDF4' : c.evidenceStrength === 'medium' ? '#FFF7ED' : '#F5F5F5',
                              color: c.evidenceStrength === 'high' ? '#166534' : c.evidenceStrength === 'medium' ? '#9A3412' : '#6B7280',
                              fontSize: '11px',
                              fontWeight: 500,
                            }}
                          >
                            {c.evidenceStrength.charAt(0).toUpperCase() + c.evidenceStrength.slice(1)}
                          </span>
                        </td>
                        <td className="py-2 px-3" style={{ width: '100px' }}>
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="py-2 px-3" style={{ width: '110px' }}>
                          <span className="text-[#6B7280]" style={{ fontSize: '11px' }}>{c.assignedAnalyst ?? 'Unassigned'}</span>
                        </td>
                        <td className="py-2 px-3" style={{ width: '120px' }}>
                          <button
                            className="px-2.5 py-1 rounded-md border border-[#E5E7EB] text-[#1A1E21] hover:bg-white"
                            style={{ fontSize: '11px', fontWeight: 500 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/case/${c.id}`, { state: { from: 'duplicates' } });
                            }}
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-6 pt-0 pb-4">
          <AppFooter />
        </div>
      </div>
    </div>
  );
}
