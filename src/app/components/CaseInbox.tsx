import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  Search,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Filter,
  User,
  X,
  Pencil,
} from 'lucide-react';
import { cases, statusLabels, priorityOrder } from '../data/cases';
import type { CaseItem, Priority, CaseStatus } from '../data/cases';
import { getCaseMetrics, getEffectiveInboxTotal } from '../data/caseMetrics';
import { SlaTimer } from './SlaTimer';
import { SignalChip } from './SignalChip';
import { AppFooter } from './AppFooter';
import { useMergedGroups } from '../state/MergedGroupsContext';
import React from 'react';

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

function StatusBadge({ status }: { status: CaseStatus }) {
  const config: Record<CaseStatus, { bg: string; text: string }> = {
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
      {statusLabels[status]}
    </span>
  );
}

type SortField = 'sla' | 'risk' | 'priority' | 'entity' | 'evidence' | 'status' | 'analyst';
type SortDir = 'asc' | 'desc';

export function CaseInbox() {
  const navigate = useNavigate();
  const location = useLocation();
  const { mergedGroupIds, unmergeGroup } = useMergedGroups();
  const signedInAnalyst = 'Tawfik Manham';
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('sla');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [statusFilters, setStatusFilters] = useState<Set<CaseStatus>>(new Set());
  const [priorityFilters, setPriorityFilters] = useState<Set<Priority>>(new Set());
  const [pendingStatusFilters, setPendingStatusFilters] = useState<Set<CaseStatus>>(new Set());
  const [pendingPriorityFilters, setPendingPriorityFilters] = useState<Set<Priority>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement | null>(null);
  const [analystMenuOpenFor, setAnalystMenuOpenFor] = useState<string | null>(null);
  const [analystSearch, setAnalystSearch] = useState('');
  const [assignedOverrides, setAssignedOverrides] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (!filtersOpen) return;
    setPendingStatusFilters(new Set(statusFilters));
    setPendingPriorityFilters(new Set(priorityFilters));
    function onClickOutside(event: MouseEvent) {
      if (!filterRef.current) return;
      if (!filterRef.current.contains(event.target as Node)) {
        setFiltersOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [filtersOpen, statusFilters, priorityFilters]);

  const analysts = ['Sarah Chen', 'Marcus Reid', 'Liam Patel', 'Nora Ali', 'Ava Williams', 'Daniel Park'];

  const queryFilter = useMemo(() => {
    const filter = new URLSearchParams(location.search).get('filter');
    return filter ?? 'all';
  }, [location.search]);

  const getVisibleAssignee = (c: CaseItem) =>
    queryFilter === 'mine' ? signedInAnalyst : (assignedOverrides[c.id] ?? c.assignedAnalyst);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  };

  const statusOrder: Record<CaseStatus, number> = {
    new: 0,
    in_review: 1,
    escalated: 2,
    pending_info: 3,
    closed: 4,
  };
  const evidenceOrder: Record<CaseItem['evidenceStrength'], number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  const filteredAndSorted = useMemo(() => {
    let filtered = cases.filter((c) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!c.entityName.toLowerCase().includes(q) && !c.id.toLowerCase().includes(q)) return false;
      }
      if (statusFilters.size > 0 && !statusFilters.has(c.status)) return false;
      if (priorityFilters.size > 0 && !priorityFilters.has(c.priority)) return false;
      if (queryFilter === 'critical' && c.priority !== 'critical') return false;
      if (queryFilter === 'sla' && (c.slaMinutesRemaining / c.slaTotalMinutes) > 0.15) return false;
      if (queryFilter === 'mine' && !c.assignedAnalyst) return false;
      if (queryFilter === 'closed' && c.status !== 'closed') return false;
      return true;
    });

    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'sla': cmp = a.slaMinutesRemaining - b.slaMinutesRemaining; break;
        case 'risk': cmp = a.riskScore - b.riskScore; break;
        case 'priority': cmp = priorityOrder[a.priority] - priorityOrder[b.priority]; break;
        case 'entity': cmp = a.entityName.localeCompare(b.entityName); break;
        case 'evidence': cmp = evidenceOrder[a.evidenceStrength] - evidenceOrder[b.evidenceStrength]; break;
        case 'status': cmp = statusOrder[a.status] - statusOrder[b.status]; break;
        case 'analyst': {
          const aName = (getVisibleAssignee(a) ?? '').toLowerCase();
          const bName = (getVisibleAssignee(b) ?? '').toLowerCase();
          cmp = aName.localeCompare(bName);
          break;
        }
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return filtered;
  }, [searchQuery, statusFilters, priorityFilters, sortField, sortDir, queryFilter, assignedOverrides]);

  const renderOrder = useMemo(() => {
    type RenderItem =
      | { type: 'group'; groupId: string; cases: CaseItem[] }
      | { type: 'case'; case: CaseItem };

    const groupedCases = new Map<string, CaseItem[]>();
    filteredAndSorted.forEach((c) => {
      if (!c.duplicateGroupId || !mergedGroupIds.has(c.duplicateGroupId)) return;
      const current = groupedCases.get(c.duplicateGroupId) ?? [];
      current.push(c);
      groupedCases.set(c.duplicateGroupId, current);
    });

    const seenGroups = new Set<string>();
    const items: RenderItem[] = [];
    filteredAndSorted.forEach((c) => {
      const groupId = c.duplicateGroupId;
      if (groupId && groupedCases.has(groupId)) {
        if (seenGroups.has(groupId)) return;
        seenGroups.add(groupId);
        items.push({ type: 'group', groupId, cases: groupedCases.get(groupId)! });
        return;
      }
      items.push({ type: 'case', case: c });
    });

    return items;
  }, [filteredAndSorted, mergedGroupIds]);

  const scenarioStats = useMemo(() => {
    const metrics = getCaseMetrics(cases);
    return {
      ...metrics,
      effectiveInboxTotal: getEffectiveInboxTotal(cases, mergedGroupIds),
    };
  }, [mergedGroupIds]);

  const toggleMergedGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };


  function SortButton({ field, label }: { field: SortField; label: string }) {
    const active = sortField === field;
    const Icon = active ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUp;
    return (
      <button
        onClick={() => toggleSort(field)}
        className={`flex items-center gap-0.5 ${active ? 'text-[#023547]' : 'text-[#6B7280]'}`}
        style={{ fontSize: '11px', fontWeight: active ? 600 : 500, letterSpacing: '0.03em' }}
      >
        {label}
        <Icon className={`w-3 h-3 ${active ? '' : 'opacity-40'}`} />
      </button>
    );
  }

  function CaseRow({ c, isGroupChild = false }: { c: CaseItem; isGroupChild?: boolean }) {
    const isCriticalSla = (c.slaMinutesRemaining / c.slaTotalMinutes) <= 0.15;
    const signalsToShow = c.signals.slice(0, 2);
    const remainingSignals = c.signals.length - signalsToShow.length;
    const assigned = getVisibleAssignee(c);
    const isMenuOpen = analystMenuOpenFor === c.id;
    const filteredAnalysts = analysts.filter((a) => a.toLowerCase().includes(analystSearch.toLowerCase()));
    const initials = assigned ? assigned.split(' ').map((p) => p[0]).join('').slice(0, 2) : '';
    return (
      <tr
        key={c.id}
        onClick={() => navigate(`/case/${c.id}`)}
        className={`group cursor-pointer transition-colors border-b border-[#EFEFEF] last:border-0 hover:bg-[#F9FAFB] ${
          isGroupChild ? 'bg-[#FAFBFC]' : ''
        }`}
      >
        {/* Priority + ID */}
        <td className="py-2.5 px-3 pl-6" style={{ width: '160px' }}>
          <div className="flex items-center gap-2">
            {isGroupChild && <span className="w-3 border-l-2 border-b-2 border-[#E5E7EB] h-3 flex-shrink-0 -mt-2 ml-1" />}
            <div>
              <PriorityIndicator priority={c.priority} />
              <span className="text-[#6B7280] mt-0.5 block" style={{ fontSize: '11px' }}>
                {c.id}
              </span>
            </div>
          </div>
        </td>
        {/* SLA - Most prominent column */}
        <td className="py-2.5 px-2" style={{ width: '112px' }}>
          <SlaTimer minutesRemaining={c.slaMinutesRemaining} totalMinutes={c.slaTotalMinutes} />
        </td>
        {/* Risk Score */}
        <td className="py-2.5 px-2" style={{ width: '50px' }}>
          <div className="flex justify-center">
            <RiskScoreBadge score={c.riskScore} />
          </div>
        </td>
        {/* Entity */}
        <td className="py-2.5 px-3" style={{ width: '180px' }}>
          <div>
            <span className="text-[#1A1E21] block" style={{ fontSize: '13px', fontWeight: 500 }}>
              {c.entityName}
            </span>
            <span className="text-[#9CA3AF]" style={{ fontSize: '11px' }}>
              {c.entityType} \u00b7 {c.country}
            </span>
          </div>
        </td>
        {/* Signals */}
        <td className="py-2.5 px-3" style={{ width: '260px' }}>
          <div className="flex flex-wrap gap-1">
            {signalsToShow.map((s) => (
              <SignalChip key={s} signal={s} />
            ))}
            {remainingSignals > 0 && (
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#F3F4F6] text-[#6B7280]"
                style={{ fontSize: '11px', fontWeight: 500 }}
              >
                +{remainingSignals} more
              </span>
            )}
          </div>
        </td>
        {/* Evidence */}
        <td className="py-2.5 px-3 text-center" style={{ width: '80px' }}>
          <span
            className={`inline-block px-1.5 py-0.5 rounded ${
              c.evidenceStrength === 'high'
                ? 'bg-[#F0FDF4] text-[#166534]'
                : c.evidenceStrength === 'medium'
                ? 'bg-[#FFF7ED] text-[#9A3412]'
                : 'bg-[#F5F5F5] text-[#6B7280]'
            }`}
            style={{ fontSize: '11px', fontWeight: 500 }}
          >
            {c.evidenceStrength.charAt(0).toUpperCase() + c.evidenceStrength.slice(1)}
          </span>
        </td>
        {/* Status */}
        <td className="py-2.5 px-3" style={{ width: '100px' }}>
          <StatusBadge status={c.status} />
        </td>
        {/* Analyst */}
        <td className="py-2.5 px-3" style={{ width: '110px' }}>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setAnalystMenuOpenFor(isMenuOpen ? null : c.id);
                setAnalystSearch('');
              }}
              className="text-left w-full flex items-center gap-2"
            >
              <div className="flex items-center gap-2 flex-1">
                {assigned ? (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#E5E7EB] text-[#6B7280]" style={{ fontSize: '9px', fontWeight: 600 }}>
                    {initials}
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#F3F4F6] text-[#9CA3AF]">
                    <User className="w-3 h-3" />
                  </span>
                )}
                {assigned ? (
                  <span className="text-[#6B7280] block truncate max-w-[72px]" style={{ fontSize: '12px' }}>{assigned}</span>
                ) : (
                  <span className="text-[#D1D5DB]" style={{ fontSize: '12px' }}>Unassigned</span>
                )}
              </div>
              <Pencil className="w-3.5 h-3.5 text-[#9CA3AF]" />
            </button>

            {isMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-52 bg-white border border-[#E5E7EB] rounded-md shadow-sm p-2 z-20"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="text"
                  placeholder="Search team..."
                  value={analystSearch}
                  onChange={(e) => setAnalystSearch(e.target.value)}
                  className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-md px-2 py-1 text-[#1A1E21] outline-none"
                  style={{ fontSize: '12px' }}
                />
                <div className="mt-2 max-h-36 overflow-auto">
                  {filteredAnalysts.map((a) => (
                    <div
                      key={a}
                      className="w-full flex items-center justify-between px-2 py-1 rounded hover:bg-[#F3F4F6]"
                    >
                      <button
                        onClick={() => {
                          setAssignedOverrides((prev) => ({ ...prev, [c.id]: a }));
                          setAnalystMenuOpenFor(null);
                        }}
                        className="text-left text-[#1A1E21] flex-1"
                        style={{ fontSize: '12px' }}
                      >
                        {a}
                      </button>
                      {assigned === a && (
                        <button
                          onClick={() => {
                            setAssignedOverrides((prev) => ({ ...prev, [c.id]: null }));
                            setAnalystMenuOpenFor(null);
                          }}
                          className="text-[#6B7280] hover:text-[#1A1E21]"
                          aria-label="Unassign"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </td>
        {/* Actions */}
        <td className="py-2.5 px-3" style={{ width: '120px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/case/${c.id}`);
            }}
            className="px-2.5 py-1 rounded-md border border-[#E5E7EB] text-[#1A1E21] hover:bg-white"
            style={{ fontSize: '11px', fontWeight: 500 }}
          >
            Review
          </button>
        </td>
      </tr>
    );
  }

  function GroupRow({ groupId, groupCases }: { groupId: string; groupCases: CaseItem[] }) {
    const isExpanded = expandedGroups.has(groupId);
    const leadCase = groupCases[0];
    const minSla = Math.min(...groupCases.map((c) => c.slaMinutesRemaining));
    const maxRisk = Math.max(...groupCases.map((c) => c.riskScore));
    const groupPriority = groupCases.reduce(
      (acc, c) => (priorityOrder[c.priority] < priorityOrder[acc] ? c.priority : acc),
      groupCases[0].priority,
    );
    const evidenceSet = new Set(groupCases.map((c) => c.evidenceStrength));
    const evidenceLabel = evidenceSet.size === 1 ? groupCases[0].evidenceStrength : 'mixed';
    const statusSet = new Set(groupCases.map((c) => c.status));
    const statusLabel = statusSet.size === 1 ? statusLabels[groupCases[0].status] : 'Mixed';
    const signalSet = new Set(groupCases.flatMap((c) => c.signals));
    const topSignals = Array.from(signalSet).slice(0, 2);
    const remainingSignals = Math.max(signalSet.size - topSignals.length, 0);
    const analystSet = new Set(
      groupCases.map((c) => getVisibleAssignee(c)).filter(Boolean),
    );
    const analystLabel = analystSet.size === 0 ? 'Unassigned' : analystSet.size === 1 ? Array.from(analystSet)[0] : 'Multiple';

    return (
      <React.Fragment>
        <tr
          className="bg-[#F8FAFC] border-b border-[#EFEFEF] hover:bg-[#F1F5F9] cursor-pointer transition-colors"
          onClick={() => toggleMergedGroup(groupId)}
        >
          <td className="py-2.5 px-3 pl-6" style={{ width: '160px' }}>
            <div className="flex items-center gap-2">
              <PriorityIndicator priority={groupPriority} />
              <span className="text-[#6B7280]" style={{ fontSize: '11px' }}>
                {groupCases.length} merged cases
              </span>
            </div>
          </td>
          <td className="py-2.5 px-2" style={{ width: '112px' }}>
            <SlaTimer minutesRemaining={minSla} totalMinutes={leadCase.slaTotalMinutes} />
          </td>
          <td className="py-2.5 px-2" style={{ width: '50px' }}>
            <div className="flex justify-center">
              <RiskScoreBadge score={maxRisk} />
            </div>
          </td>
          <td className="py-2.5 px-3" style={{ width: '180px' }}>
            <div>
              <span className="text-[#1A1E21] block" style={{ fontSize: '13px', fontWeight: 600 }}>
                {leadCase.entityName}
              </span>
              <span className="text-[#9CA3AF]" style={{ fontSize: '11px' }}>
                {leadCase.entityType} · {leadCase.country}
              </span>
            </div>
          </td>
          <td className="py-2.5 px-3" style={{ width: '260px' }}>
            <div className="flex flex-wrap gap-1">
              {topSignals.map((signal) => (
                <SignalChip key={signal} signal={signal} />
              ))}
              {remainingSignals > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#F3F4F6] text-[#6B7280]" style={{ fontSize: '11px', fontWeight: 500 }}>
                  +{remainingSignals} more
                </span>
              )}
            </div>
          </td>
          <td className="py-2.5 px-3 text-center" style={{ width: '80px' }}>
            <span
              className={`inline-block px-1.5 py-0.5 rounded ${
                evidenceLabel === 'high'
                  ? 'bg-[#F0FDF4] text-[#166534]'
                  : evidenceLabel === 'medium'
                  ? 'bg-[#FFF7ED] text-[#9A3412]'
                  : evidenceLabel === 'low'
                  ? 'bg-[#F5F5F5] text-[#6B7280]'
                  : 'bg-[#E5E7EB] text-[#6B7280]'
              }`}
              style={{ fontSize: '11px', fontWeight: 500 }}
            >
              {evidenceLabel === 'mixed' ? 'Mixed' : evidenceLabel.charAt(0).toUpperCase() + evidenceLabel.slice(1)}
            </span>
          </td>
          <td className="py-2.5 px-3" style={{ width: '100px' }}>
            {statusLabel === 'Mixed' ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#F3F4F6] text-[#6B7280]" style={{ fontSize: '11px', fontWeight: 500 }}>
                Mixed
              </span>
            ) : (
              <StatusBadge status={leadCase.status} />
            )}
          </td>
          <td className="py-2.5 px-3" style={{ width: '110px' }}>
            <span className="text-[#6B7280] block truncate" style={{ fontSize: '12px' }}>{analystLabel}</span>
          </td>
          <td className="py-2.5 px-3" style={{ width: '120px' }}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/case/${leadCase.id}`);
                  }}
                  className="px-2.5 py-1 rounded-md border border-[#E5E7EB] text-[#1A1E21] hover:bg-white"
                  style={{ fontSize: '11px', fontWeight: 500 }}
                >
                  Review
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    unmergeGroup(groupId);
                    setExpandedGroups((prev) => {
                      const next = new Set(prev);
                      next.delete(groupId);
                      return next;
                    });
                  }}
                  className="px-2.5 py-1 rounded-md border border-[#E5E7EB] text-[#6B7280] hover:text-[#1A1E21] hover:bg-white"
                  style={{ fontSize: '11px', fontWeight: 500 }}
                >
                  Unmerge
                </button>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMergedGroup(groupId);
                }}
                className="px-2 py-1 rounded-md text-[#6B7280] hover:text-[#1A1E21] hover:bg-[#F3F4F6]"
                aria-label={isExpanded ? 'Collapse group' : 'Expand group'}
                style={{ fontSize: '11px', fontWeight: 500 }}
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </td>
        </tr>
        {isExpanded && groupCases.map((c) => (
          <CaseRow key={c.id} c={c} isGroupChild />
        ))}
      </React.Fragment>
    );
  }

  return (
    <div className="flex-1 min-w-0 h-full overflow-auto flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#F5F5F5] border-b border-[#EFEFEF]">
        {/* Stats bar */}
        <div className="px-6 py-3 flex items-center gap-6 border-b border-[#EFEFEF]">
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#1A1E21' }}>Case Inbox</h1>
          <div className="flex items-center gap-4 ml-auto">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-md border border-[#EFEFEF]">
              <span className="text-[#6B7280]" style={{ fontSize: '12px' }}>Total</span>
              <span className="text-[#1A1E21]" style={{ fontSize: '14px', fontWeight: 600 }}>{scenarioStats.effectiveInboxTotal}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EFF6FF] rounded-md">
              <span className="w-2 h-2 rounded-full bg-[#1E40AF]" />
              <span className="text-[#1E40AF]" style={{ fontSize: '12px' }}>Duplicate Groups</span>
              <span className="text-[#1E40AF]" style={{ fontSize: '14px', fontWeight: 600 }}>{scenarioStats.duplicateGroups}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFF7ED] rounded-md">
              <span className="w-2 h-2 rounded-full bg-[#E17100]" />
              <span className="text-[#9A3412]" style={{ fontSize: '12px' }}>High Priority</span>
              <span className="text-[#9A3412]" style={{ fontSize: '14px', fontWeight: 600 }}>{scenarioStats.highPriority}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FEE2E2] rounded-md">
              <span className="w-2 h-2 rounded-full bg-[#E7000B]" />
              <span className="text-[#991B1B]" style={{ fontSize: '12px' }}>SLA Breach</span>
              <span className="text-[#991B1B]" style={{ fontSize: '14px', fontWeight: 600 }}>{scenarioStats.slaBreach}</span>
            </div>
          </div>
        </div>

        {/* Search + filter bar */}
        <div className="px-6 py-2.5">
          <div className="mx-auto w-full max-w-[1440px] flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-[#EFEFEF] rounded-md px-3 py-1.5 flex-1 max-w-sm">
              <Search className="w-4 h-4 text-[#9CA3AF]" />
              <input
                type="text"
                placeholder="Search by entity or case ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent outline-none flex-1 text-[#1A1E21] placeholder:text-[#9CA3AF]"
                style={{ fontSize: '13px' }}
              />
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {(searchQuery || statusFilters.size > 0 || priorityFilters.size > 0) && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilters(new Set());
                      setPriorityFilters(new Set());
                    }}
                    className="text-[#6B7280] hover:text-[#1A1E21]"
                    style={{ fontSize: '11px', fontWeight: 600 }}
                  >
                    Clear all
                  </button>
                  {searchQuery && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F3F4F6] text-[#1A1E21] border border-[#E5E7EB]" style={{ fontSize: '11px', fontWeight: 500 }}>
                      Search: {searchQuery}
                      <button
                        onClick={() => setSearchQuery('')}
                        className="text-[#6B7280] hover:text-[#1A1E21]"
                        aria-label="Clear search"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {Array.from(statusFilters).map((status) => (
                    <span key={status} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]" style={{ fontSize: '11px', fontWeight: 500 }}>
                      Status: {statusLabels[status]}
                      <button
                        onClick={() => {
                          setStatusFilters((prev) => {
                            const next = new Set(prev);
                            next.delete(status);
                            return next;
                          });
                        }}
                        className="text-[#1E40AF] hover:text-[#1E3A8A]"
                        aria-label="Clear status filter"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {Array.from(priorityFilters).map((priority) => (
                    <span key={priority} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF7ED] text-[#9A3412] border border-[#FED7AA]" style={{ fontSize: '11px', fontWeight: 500 }}>
                      Priority: {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      <button
                        onClick={() => {
                          setPriorityFilters((prev) => {
                            const next = new Set(prev);
                            next.delete(priority);
                            return next;
                          });
                        }}
                        className="text-[#9A3412] hover:text-[#7C2D12]"
                        aria-label="Clear priority filter"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => setFiltersOpen((v) => !v)}
                  className="flex items-center gap-1.5 bg-white border border-[#EFEFEF] rounded-md px-2.5 py-1.5 text-[#6B7280] hover:text-[#1A1E21] transition-colors"
                  style={{ fontSize: '12px' }}
                  aria-label="Filters"
                >
                  <span className="relative inline-flex">
                    <Filter className="w-3.5 h-3.5" />
                    {(statusFilters.size > 0 || priorityFilters.size > 0) && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#E17100]" />
                    )}
                  </span>
                  Filters
                </button>

                {filtersOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-[#E5E7EB] rounded-md shadow-sm p-3 z-20">
                    <div className="space-y-2">
                      <div>
                        <label className="text-[#9CA3AF]" style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.05em' }}>
                          STATUS
                        </label>
                        <div className="mt-1 space-y-1">
                          {(['new', 'in_review', 'escalated', 'pending_info', 'closed'] as CaseStatus[]).map((status) => (
                            <label key={status} className="flex items-center gap-2 text-[#1A1E21]" style={{ fontSize: '12px' }}>
                              <input
                                type="checkbox"
                                checked={pendingStatusFilters.has(status)}
                                onChange={(e) => {
                                  setPendingStatusFilters((prev) => {
                                    const next = new Set(prev);
                                    if (e.target.checked) next.add(status);
                                    else next.delete(status);
                                    return next;
                                  });
                                }}
                              />
                              {statusLabels[status]}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="border-t border-[#E5E7EB] pt-2">
                        <label className="text-[#9CA3AF]" style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.05em' }}>
                          PRIORITY
                        </label>
                        <div className="mt-1 space-y-1">
                          {(['critical', 'high', 'medium', 'low'] as Priority[]).map((priority) => (
                            <label key={priority} className="flex items-center gap-2 text-[#1A1E21]" style={{ fontSize: '12px' }}>
                              <input
                                type="checkbox"
                                checked={pendingPriorityFilters.has(priority)}
                                onChange={(e) => {
                                  setPendingPriorityFilters((prev) => {
                                    const next = new Set(prev);
                                    if (e.target.checked) next.add(priority);
                                    else next.delete(priority);
                                    return next;
                                  });
                                }}
                              />
                              {priority.charAt(0).toUpperCase() + priority.slice(1)}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => {
                            setPendingStatusFilters(new Set());
                            setPendingPriorityFilters(new Set());
                          }}
                          className="px-2.5 py-1 rounded-md text-[#6B7280] hover:text-[#1A1E21]"
                          style={{ fontSize: '11px', fontWeight: 500 }}
                        >
                          Reset
                        </button>
                        <button
                          onClick={() => {
                            setStatusFilters(new Set(pendingStatusFilters));
                            setPriorityFilters(new Set(pendingPriorityFilters));
                            setFiltersOpen(false);
                          }}
                          className="ml-auto px-2.5 py-1 rounded-md bg-[#023547] text-white"
                          style={{ fontSize: '11px', fontWeight: 600 }}
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {/* Table */}
        <div className="px-6 py-3 flex-1">
            <div className="mx-auto w-full max-w-[1440px] bg-white rounded-lg border border-[#EFEFEF] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#EFEFEF] bg-[#FAFBFC]">
                    <th className="py-2 px-3 pl-6 text-left"><SortButton field="priority" label="PRIORITY" /></th>
                    <th className="py-2 px-3 text-left"><SortButton field="sla" label="SLA" /></th>
                    <th className="py-2 px-3">
                      <div className="flex justify-center">
                        <SortButton field="risk" label="RISK" />
                      </div>
                    </th>
                    <th className="py-2 px-3 text-left"><SortButton field="entity" label="ENTITY" /></th>
                    <th className="py-2 px-3 text-left" style={{ fontSize: '11px', fontWeight: 500, color: '#6B7280', letterSpacing: '0.03em' }}>SIGNALS</th>
                    <th className="py-2 px-3 text-center">
                      <div className="flex justify-center">
                        <SortButton field="evidence" label="EVIDENCE" />
                      </div>
                    </th>
                    <th className="py-2 px-3 text-left">
                      <SortButton field="status" label="STATUS" />
                    </th>
                    <th className="py-2 px-3 text-left">
                      <SortButton field="analyst" label="ANALYST" />
                    </th>
                    <th className="py-2 px-3 text-left" style={{ fontSize: '11px', fontWeight: 500, color: '#6B7280', letterSpacing: '0.03em' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {renderOrder.map((item) => (
                  item.type === 'group'
                    ? <GroupRow key={item.groupId} groupId={item.groupId} groupCases={item.cases} />
                    : <CaseRow key={item.case.id} c={item.case} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-6 pt-1 pb-4">
          <AppFooter />
        </div>
      </div>
    </div>
  );
}
