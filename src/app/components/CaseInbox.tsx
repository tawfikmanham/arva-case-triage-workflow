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
  Layers,
} from 'lucide-react';
import { cases, statusLabels, priorityOrder } from '../data/cases';
import type { CaseItem, Priority, CaseStatus, Signal } from '../data/cases';
import { SlaTimer } from './SlaTimer';
import { SignalChip } from './SignalChip';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['grp-acme', 'grp-greenleaf']));
  const [ungroupedGroups, setUngroupedGroups] = useState<Set<string>>(new Set());
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
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(new Set());
  const [groupRationale, setGroupRationale] = useState('same_name');
  const [groupConfidence, setGroupConfidence] = useState(82);

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
  const [manualGroups, setManualGroups] = useState<
    { id: string; caseIds: string[]; rationale: string; confidence?: number }[]
  >([]);

  const queryFilter = useMemo(() => {
    const filter = new URLSearchParams(location.search).get('filter');
    return filter ?? 'all';
  }, [location.search]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const toggleUngroup = (groupId: string) => {
    setUngroupedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const effectiveGroupIdFor = (c: CaseItem) => {
    const manual = manualGroups.find((g) => g.caseIds.includes(c.id));
    if (manual) return manual.id;
    return null;
  };

  const createManualGroup = () => {
    if (selectedCaseIds.size < 2) return;
    const id = `grp-manual-${manualGroups.length + 1}`;
    const caseIds = Array.from(selectedCaseIds);
    setManualGroups((prev) => [...prev, { id, caseIds, rationale: groupRationale, confidence: groupConfidence }]);
    setSelectedCaseIds(new Set());
    setExpandedGroups((prev) => new Set(prev).add(id));
  };


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
          const aName = (assignedOverrides[a.id] ?? a.assignedAnalyst ?? '').toLowerCase();
          const bName = (assignedOverrides[b.id] ?? b.assignedAnalyst ?? '').toLowerCase();
          cmp = aName.localeCompare(bName);
          break;
        }
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return filtered;
  }, [searchQuery, statusFilters, priorityFilters, sortField, sortDir, queryFilter]);

  // Group cases by duplicate group
  const { groups, standalone } = useMemo(() => {
    const groupMap = new Map<string, CaseItem[]>();
    const standalone: CaseItem[] = [];

    filteredAndSorted.forEach((c) => {
      const groupId = effectiveGroupIdFor(c);
      if (groupId && !ungroupedGroups.has(groupId)) {
        const existing = groupMap.get(groupId) || [];
        existing.push(c);
        groupMap.set(groupId, existing);
      } else {
        standalone.push(c);
      }
    });

    return { groups: groupMap, standalone };
  }, [filteredAndSorted, ungroupedGroups, manualGroups]);

  const selectableCaseIds = useMemo(() => {
    return standalone.map((c) => c.id);
  }, [standalone]);


  // Interleave groups and standalone by active sort
  const renderOrder = useMemo(() => {
    type RenderItem =
      | { type: 'group'; groupId: string; cases: CaseItem[] }
      | { type: 'case'; case: CaseItem };
    const items: RenderItem[] = [];

    groups.forEach((cases, groupId) => {
      items.push({ type: 'group', groupId, cases });
    });
    standalone.forEach((c) => {
      items.push({ type: 'case', case: c });
    });

    const getGroupValue = (groupCases: CaseItem[]) => {
      switch (sortField) {
        case 'sla':
          return Math.min(...groupCases.map((c) => c.slaMinutesRemaining));
        case 'risk':
          return Math.max(...groupCases.map((c) => c.riskScore));
        case 'priority':
          return Math.min(...groupCases.map((c) => priorityOrder[c.priority]));
        case 'entity':
          return groupCases[0]?.entityName ?? '';
        case 'evidence':
          return Math.min(...groupCases.map((c) => evidenceOrder[c.evidenceStrength]));
        case 'status':
          return Math.min(...groupCases.map((c) => statusOrder[c.status]));
        case 'analyst': {
          const names = groupCases
            .map((c) => (assignedOverrides[c.id] ?? c.assignedAnalyst ?? '').toLowerCase())
            .filter(Boolean)
            .sort();
          return names[0] ?? '';
        }
      }
    };

    items.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'entity' || sortField === 'analyst') {
        const valA = a.type === 'group' ? (getGroupValue(a.cases) as string) : a.case.entityName;
        const valB = b.type === 'group' ? (getGroupValue(b.cases) as string) : b.case.entityName;
        cmp = valA.localeCompare(valB);
      } else {
        const valA = a.type === 'group' ? (getGroupValue(a.cases) as number) : (
          sortField === 'sla'
            ? a.case.slaMinutesRemaining
            : sortField === 'risk'
              ? a.case.riskScore
              : sortField === 'evidence'
                ? evidenceOrder[a.case.evidenceStrength]
                : sortField === 'status'
                  ? statusOrder[a.case.status]
                  : priorityOrder[a.case.priority]
        );
        const valB = b.type === 'group' ? (getGroupValue(b.cases) as number) : (
          sortField === 'sla'
            ? b.case.slaMinutesRemaining
            : sortField === 'risk'
              ? b.case.riskScore
              : sortField === 'evidence'
                ? evidenceOrder[b.case.evidenceStrength]
                : sortField === 'status'
                  ? statusOrder[b.case.status]
                  : priorityOrder[b.case.priority]
        );
        cmp = valA - valB;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return items;
  }, [groups, standalone, sortField, sortDir]);

  const scenarioStats = useMemo(() => ({
    total: cases.length,
    duplicates: cases.filter((c) => c.duplicateGroupId).length,
    highPriority: cases.filter((c) => c.priority === 'critical' || c.priority === 'high').length,
    slaDueToday: cases.filter(
      (c) => (c.priority === 'critical' || c.priority === 'high') && c.slaMinutesRemaining <= 60
    ).length,
  }), []);


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
    const assigned = assignedOverrides[c.id] ?? c.assignedAnalyst;
    const isMenuOpen = analystMenuOpenFor === c.id;
    const filteredAnalysts = analysts.filter((a) => a.toLowerCase().includes(analystSearch.toLowerCase()));
    const initials = assigned ? assigned.split(' ').map((p) => p[0]).join('').slice(0, 2) : '';
    const suggestedGroupId = c.duplicateGroupId;
    const isFirstInSuggestion =
      suggestedGroupId && filteredAndSorted.find((x) => x.duplicateGroupId === suggestedGroupId)?.id === c.id;
    return (
      <tr
        key={c.id}
        onClick={() => navigate(`/case/${c.id}`)}
        className={`group cursor-pointer transition-colors border-b border-[#EFEFEF] last:border-0 hover:bg-[#F9FAFB] ${
          isGroupChild ? 'bg-[#FAFBFC]' : ''
        }`}
      >
        {/* Select */}
        <td className="p-2 pl-4" style={{ width: '28px' }}>
          {!isGroupChild && (
            <input
              type="checkbox"
              checked={selectedCaseIds.has(c.id)}
              onChange={(e) => {
                e.stopPropagation();
                setSelectedCaseIds((prev) => {
                  const next = new Set(prev);
                  if (e.target.checked) next.add(c.id);
                  else next.delete(c.id);
                  return next;
                });
              }}
            />
          )}
        </td>
        {/* Priority + ID */}
        <td className="py-2.5 px-3 pl-4" style={{ width: '160px' }}>
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
        <td className="py-2.5 px-3" style={{ width: '160px' }}>
          <SlaTimer minutesRemaining={c.slaMinutesRemaining} totalMinutes={c.slaTotalMinutes} />
        </td>
        {/* Risk Score */}
        <td className="py-2.5 px-3" style={{ width: '70px' }}>
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
                  <span className="text-[#6B7280]" style={{ fontSize: '12px' }}>{assigned}</span>
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
          <div className="flex items-center gap-2">
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
            {isFirstInSuggestion && suggestedGroupId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const suggestedIds = filteredAndSorted
                    .filter((x) => x.duplicateGroupId === suggestedGroupId)
                    .map((x) => x.id);
                  setSelectedCaseIds(new Set(suggestedIds));
                }}
                className="px-2 py-1 rounded-md border border-[#E5E7EB] text-[#1E40AF] hover:bg-white flex items-center gap-1"
                style={{ fontSize: '11px', fontWeight: 500 }}
              >
                <Layers className="w-3 h-3" />
                Group
              </button>
            )}
          </div>
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
      groupCases[0].priority
    );
    const evidenceSet = new Set(groupCases.map((c) => c.evidenceStrength));
    const evidenceLabel = evidenceSet.size === 1 ? groupCases[0].evidenceStrength : 'mixed';
    const statusSet = new Set(groupCases.map((c) => c.status));
    const analystSet = new Set(
      groupCases.map((c) => assignedOverrides[c.id] ?? c.assignedAnalyst).filter(Boolean)
    );
    const statusLabel = statusSet.size === 1 ? statusLabels[groupCases[0].status] : 'Mixed';

    const signalCounts = new Map<string, number>();
    groupCases.forEach((c) => c.signals.forEach((s) => signalCounts.set(s, (signalCounts.get(s) ?? 0) + 1)));
    const topSignals = Array.from(signalCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([s]) => s as Signal)
      .slice(0, 2);
    const remainingSignals = Math.max(signalCounts.size - topSignals.length, 0);

    const manualGroup = manualGroups.find((g) => g.id === groupId);
    const isMenuOpen = analystMenuOpenFor === `group:${groupId}`;
    const filteredAnalysts = analysts.filter((a) => a.toLowerCase().includes(analystSearch.toLowerCase()));
    const groupAssigned = analystSet.size === 1 ? Array.from(analystSet)[0] : null;
    const groupInitials = groupAssigned ? groupAssigned.split(' ').map((p) => p[0]).join('').slice(0, 2) : '';

    const setGroupAssignment = (name: string | null) => {
      setAssignedOverrides((prev) => {
        const next = { ...prev };
        groupCases.forEach((c) => {
          next[c.id] = name;
        });
        return next;
      });
      setAnalystMenuOpenFor(null);
    };

    return (
      <React.Fragment>
        <tr
          className="bg-[#F8FAFC] border-b border-[#EFEFEF] hover:bg-[#F1F5F9] transition-colors"
          onClick={() => toggleGroup(groupId)}
        >
          {/* Select */}
          <td className="p-2 pl-4" style={{ width: '28px' }} />
          {/* Priority */}
          <td className="py-2.5 px-3 pl-4" style={{ width: '160px' }}>
            <div className="flex items-center gap-2">
              <PriorityIndicator priority={groupPriority} />
              <span className="text-[#6B7280]" style={{ fontSize: '11px' }}>
                {groupCases.length} linked cases
              </span>
            </div>
          </td>
          {/* SLA */}
          <td className="py-2.5 px-3" style={{ width: '160px' }}>
            <SlaTimer minutesRemaining={minSla} totalMinutes={leadCase.slaTotalMinutes} />
          </td>
          {/* Risk */}
          <td className="py-2.5 px-3" style={{ width: '70px' }}>
            <div className="flex justify-center">
              <RiskScoreBadge score={maxRisk} />
            </div>
          </td>
          {/* Entity */}
          <td className="py-2.5 px-3" style={{ width: '180px' }}>
            <div>
              <span className="text-[#1A1E21] block" style={{ fontSize: '13px', fontWeight: 600 }}>
                {leadCase.entityName}
              </span>
              <div className="text-[#9CA3AF]" style={{ fontSize: '11px' }}>
                Highest risk: {maxRisk} \u00b7 Earliest SLA: {Math.max(minSla, 0)}m
              </div>
              {manualGroup && (
                <div className="text-[#6B7280]" style={{ fontSize: '10px' }}>
                  Grouped: {manualGroup.rationale.replace('_', ' ')}
                  {manualGroup.confidence ? ` \u00b7 ${manualGroup.confidence}%` : ''}
                </div>
              )}
            </div>
          </td>
          {/* Signals */}
          <td className="py-2.5 px-3" style={{ width: '260px' }}>
            <div className="flex flex-wrap gap-1">
              {topSignals.map((s) => (
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
          {/* Status */}
          <td className="py-2.5 px-3" style={{ width: '100px' }}>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded ${
                statusLabel === 'Mixed' ? 'bg-[#F3F4F6] text-[#6B7280]' : 'bg-[#EFF6FF] text-[#1E40AF]'
              }`}
              style={{ fontSize: '11px', fontWeight: 500 }}
            >
              {statusLabel}
            </span>
          </td>
          {/* Analyst */}
          <td className="py-2.5 px-3" style={{ width: '110px' }}>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setAnalystMenuOpenFor(isMenuOpen ? null : `group:${groupId}`);
                  setAnalystSearch('');
                }}
                className="text-left w-full flex items-center gap-2"
              >
                <div className="flex items-center gap-2 flex-1">
                  {analystSet.size === 1 ? (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#E5E7EB] text-[#6B7280]" style={{ fontSize: '9px', fontWeight: 600 }}>
                      {groupInitials}
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#F3F4F6] text-[#9CA3AF]">
                      <User className="w-3 h-3" />
                    </span>
                  )}
                  {analystSet.size === 0 ? (
                    <span className="text-[#D1D5DB]" style={{ fontSize: '12px' }}>Unassigned</span>
                  ) : analystSet.size === 1 ? (
                    <span className="text-[#6B7280]" style={{ fontSize: '12px' }}>{groupAssigned}</span>
                  ) : (
                    <span className="text-[#9CA3AF]" style={{ fontSize: '12px' }}>Multiple</span>
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
                          onClick={() => setGroupAssignment(a)}
                          className="text-left text-[#1A1E21] flex-1"
                          style={{ fontSize: '12px' }}
                        >
                          {a}
                        </button>
                        {groupAssigned === a && (
                          <button
                            onClick={() => setGroupAssignment(null)}
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
            <div className="flex items-center justify-between">
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
                  toggleUngroup(groupId);
                }}
                className="px-2.5 py-1 rounded-md border border-[#E5E7EB] text-[#6B7280] hover:text-[#1A1E21] hover:bg-white"
                style={{ fontSize: '11px', fontWeight: 500 }}
              >
                Ungroup
              </button>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleGroup(groupId);
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
        {isExpanded &&
          groupCases.map((c) => (
            <tr
              key={c.id}
              className="bg-white border-b border-[#EFEFEF] hover:bg-[#F9FAFB]"
            >
              <td className="p-2 pl-4" style={{ width: '28px' }} />
              <td className="py-2 px-3 pl-4" style={{ width: '160px' }}>
                <div className="flex items-center gap-2">
                  <span className="w-3 border-l-2 border-b-2 border-[#E5E7EB] h-3 flex-shrink-0 -mt-2 ml-1" />
                  <span className="text-[#6B7280]" style={{ fontSize: '11px' }}>{c.id}</span>
                </div>
              </td>
              <td className="py-2 px-3" style={{ width: '160px' }}>
                <SlaTimer minutesRemaining={c.slaMinutesRemaining} totalMinutes={c.slaTotalMinutes} />
              </td>
              <td className="py-2 px-3" style={{ width: '70px' }}>
                <div className="flex justify-center">
                  <RiskScoreBadge score={c.riskScore} />
                </div>
              </td>
              <td className="py-2 px-3" style={{ width: '180px' }}>
                <span className="text-[#6B7280]" style={{ fontSize: '12px' }}>{c.entityType} \u00b7 {c.country}</span>
              </td>
              <td className="py-2 px-3" style={{ width: '260px' }}>
                <div className="flex flex-wrap gap-1">
                  {c.signals.slice(0, 2).map((s) => (
                    <SignalChip key={s} signal={s} />
                  ))}
                  {c.signals.length > 2 && (
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#F3F4F6] text-[#6B7280]"
                      style={{ fontSize: '11px', fontWeight: 500 }}
                    >
                      +{c.signals.length - 2} more
                    </span>
                  )}
                </div>
              </td>
              <td className="py-2 px-3 text-center" style={{ width: '80px' }}>
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
              <td className="py-2 px-3" style={{ width: '100px' }}>
                <StatusBadge status={c.status} />
              </td>
              <td className="py-2 px-3" style={{ width: '110px' }}>
                {assignedOverrides[c.id] ?? c.assignedAnalyst ? (
                  <span className="text-[#6B7280]" style={{ fontSize: '12px' }}>
                    {assignedOverrides[c.id] ?? c.assignedAnalyst}
                  </span>
                ) : (
                  <span className="text-[#D1D5DB]" style={{ fontSize: '12px' }}>Unassigned</span>
                )}
              </td>
              <td className="py-2 px-3" style={{ width: '120px' }}>
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
          ))}
      </React.Fragment>
    );
  }

  return (
    <div className="flex-1 min-w-0 h-screen overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#F5F5F5] border-b border-[#EFEFEF]">
        {/* Stats bar */}
        <div className="px-6 py-3 flex items-center gap-6 border-b border-[#EFEFEF]">
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#1A1E21' }}>Case Inbox</h1>
          <div className="flex items-center gap-4 ml-auto">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-md border border-[#EFEFEF]">
              <span className="text-[#6B7280]" style={{ fontSize: '12px' }}>Total</span>
              <span className="text-[#1A1E21]" style={{ fontSize: '14px', fontWeight: 600 }}>{scenarioStats.total}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EFF6FF] rounded-md">
              <span className="w-2 h-2 rounded-full bg-[#1E40AF]" />
              <span className="text-[#1E40AF]" style={{ fontSize: '12px' }}>Duplicates</span>
              <span className="text-[#1E40AF]" style={{ fontSize: '14px', fontWeight: 600 }}>{scenarioStats.duplicates}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFF7ED] rounded-md">
              <span className="w-2 h-2 rounded-full bg-[#E17100]" />
              <span className="text-[#9A3412]" style={{ fontSize: '12px' }}>High Priority</span>
              <span className="text-[#9A3412]" style={{ fontSize: '14px', fontWeight: 600 }}>{scenarioStats.highPriority}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FEE2E2] rounded-md">
              <span className="w-2 h-2 rounded-full bg-[#E7000B]" />
              <span className="text-[#991B1B]" style={{ fontSize: '12px' }}>SLA Due Today</span>
              <span className="text-[#991B1B]" style={{ fontSize: '14px', fontWeight: 600 }}>{scenarioStats.slaDueToday}</span>
            </div>
          </div>
        </div>

        {/* Search + filter bar */}
        <div className="px-6 py-2.5 flex items-center gap-3">
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

      {/* Table */}
      <div className="px-6 py-3">
          {selectedCaseIds.size >= 2 && (
            <div className="mb-3 bg-white border border-[#E5E7EB] rounded-md px-3 py-2 flex items-center gap-3">
              <span className="text-[#1A1E21]" style={{ fontSize: '12px', fontWeight: 600 }}>
                {selectedCaseIds.size} selected
              </span>
              <select
                value={groupRationale}
                onChange={(e) => setGroupRationale(e.target.value)}
                className="bg-white border border-[#E5E7EB] rounded-md px-2 py-1 text-[#1A1E21] outline-none cursor-pointer"
                style={{ fontSize: '12px' }}
              >
                <option value="same_name">Same name</option>
                <option value="same_address">Same address</option>
                <option value="same_ubo">Same UBO</option>
                <option value="other">Other</option>
              </select>
              <div className="flex items-center gap-2">
                <span className="text-[#6B7280]" style={{ fontSize: '11px' }}>Confidence</span>
                <input
                  type="number"
                  min={50}
                  max={100}
                  value={groupConfidence}
                  onChange={(e) => setGroupConfidence(Number(e.target.value))}
                  className="w-16 bg-white border border-[#E5E7EB] rounded-md px-2 py-1 text-[#1A1E21] outline-none"
                  style={{ fontSize: '12px' }}
                />
                <span className="text-[#6B7280]" style={{ fontSize: '11px' }}>%</span>
              </div>
              <button
                onClick={createManualGroup}
                className="ml-auto px-3 py-1.5 rounded-md bg-[#023547] text-white"
                style={{ fontSize: '12px', fontWeight: 600 }}
              >
                Create group
              </button>
              <button
                onClick={() => setSelectedCaseIds(new Set())}
                className="px-3 py-1.5 rounded-md border border-[#E5E7EB] text-[#6B7280]"
                style={{ fontSize: '12px', fontWeight: 500 }}
              >
                Clear
              </button>
            </div>
          )}
          <div className="bg-white rounded-lg border border-[#EFEFEF] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#EFEFEF] bg-[#FAFBFC]">
                  <th className="p-2 pl-4 text-left" style={{ width: '28px' }}>
                    <input
                      type="checkbox"
                      checked={selectedCaseIds.size > 0 && selectedCaseIds.size === selectableCaseIds.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedCaseIds(new Set(selectableCaseIds));
                        else setSelectedCaseIds(new Set());
                      }}
                    />
                  </th>
                  <th className="py-2 px-3 pl-4 text-left"><SortButton field="priority" label="PRIORITY" /></th>
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
              {renderOrder.map((item) => {
                if (item.type === 'case') {
                  return <CaseRow key={item.case.id} c={item.case} />;
                }

                return <GroupRow key={item.groupId} groupId={item.groupId} groupCases={item.cases} />;
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
