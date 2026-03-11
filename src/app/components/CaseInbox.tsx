import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Search,
  SlidersHorizontal,
  Zap,
  ChevronDown,
  ChevronRight,
  Layers,
  ArrowUpDown,
  Users,
} from 'lucide-react';
import { cases, statusLabels, priorityOrder } from '../data/cases';
import type { CaseItem, Priority, CaseStatus } from '../data/cases';
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

type SortField = 'sla' | 'risk' | 'priority' | 'entity';
type SortDir = 'asc' | 'desc';

export function CaseInbox() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['grp-acme', 'grp-greenleaf']));
  const [sortField, setSortField] = useState<SortField>('sla');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [statusFilter, setStatusFilter] = useState<CaseStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  };

  const filteredAndSorted = useMemo(() => {
    let filtered = cases.filter((c) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!c.entityName.toLowerCase().includes(q) && !c.id.toLowerCase().includes(q)) return false;
      }
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && c.priority !== priorityFilter) return false;
      return true;
    });

    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'sla': cmp = a.slaMinutesRemaining - b.slaMinutesRemaining; break;
        case 'risk': cmp = b.riskScore - a.riskScore; break;
        case 'priority': cmp = priorityOrder[a.priority] - priorityOrder[b.priority]; break;
        case 'entity': cmp = a.entityName.localeCompare(b.entityName); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return filtered;
  }, [searchQuery, statusFilter, priorityFilter, sortField, sortDir]);

  // Group cases by duplicate group
  const { groups, standalone } = useMemo(() => {
    const groupMap = new Map<string, CaseItem[]>();
    const standalone: CaseItem[] = [];

    filteredAndSorted.forEach((c) => {
      if (c.duplicateGroupId) {
        const existing = groupMap.get(c.duplicateGroupId) || [];
        existing.push(c);
        groupMap.set(c.duplicateGroupId, existing);
      } else {
        standalone.push(c);
      }
    });

    return { groups: groupMap, standalone };
  }, [filteredAndSorted]);

  // Interleave groups and standalone by earliest SLA
  const renderOrder = useMemo(() => {
    type RenderItem = { type: 'group'; groupId: string; cases: CaseItem[] } | { type: 'case'; case: CaseItem };
    const items: RenderItem[] = [];

    groups.forEach((cases, groupId) => {
      items.push({ type: 'group', groupId, cases });
    });
    standalone.forEach((c) => {
      items.push({ type: 'case', case: c });
    });

    items.sort((a, b) => {
      const slaA = a.type === 'group' ? Math.min(...a.cases.map((c) => c.slaMinutesRemaining)) : a.case.slaMinutesRemaining;
      const slaB = b.type === 'group' ? Math.min(...b.cases.map((c) => c.slaMinutesRemaining)) : b.case.slaMinutesRemaining;
      return slaA - slaB;
    });

    return items;
  }, [groups, standalone]);

  const stats = useMemo(() => ({
    total: cases.length,
    critical: cases.filter((c) => c.priority === 'critical').length,
    slaBreach: cases.filter((c) => (c.slaMinutesRemaining / c.slaTotalMinutes) <= 0.15).length,
    unassigned: cases.filter((c) => !c.assignedAnalyst).length,
  }), []);

  const nextBestCase = useMemo(() => {
    return filteredAndSorted.find((c) => c.status === 'new' && !c.assignedAnalyst);
  }, [filteredAndSorted]);

  function SortButton({ field, label }: { field: SortField; label: string }) {
    const active = sortField === field;
    return (
      <button
        onClick={() => toggleSort(field)}
        className={`flex items-center gap-0.5 ${active ? 'text-[#023547]' : 'text-[#6B7280]'}`}
        style={{ fontSize: '11px', fontWeight: active ? 600 : 500, letterSpacing: '0.03em' }}
      >
        {label}
        <ArrowUpDown className="w-3 h-3" />
      </button>
    );
  }

  function CaseRow({ c, isGroupChild = false }: { c: CaseItem; isGroupChild?: boolean }) {
    const isCriticalSla = (c.slaMinutesRemaining / c.slaTotalMinutes) <= 0.15;
    return (
      <tr
        key={c.id}
        onClick={() => navigate(`/case/${c.id}`)}
        className={`group cursor-pointer transition-colors border-b border-[#EFEFEF] last:border-0 ${
          isCriticalSla ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-[#F9FAFB]'
        } ${isGroupChild ? 'bg-[#FAFBFC]' : ''}`}
      >
        {/* Priority + ID */}
        <td className="py-2.5 px-3" style={{ width: '160px' }}>
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
        {/* SLA - Most prominent column */}
        <td className="py-2.5 px-3" style={{ width: '160px' }}>
          <SlaTimer minutesRemaining={c.slaMinutesRemaining} totalMinutes={c.slaTotalMinutes} />
        </td>
        {/* Risk Score */}
        <td className="py-2.5 px-3 text-center" style={{ width: '70px' }}>
          <RiskScoreBadge score={c.riskScore} />
        </td>
        {/* Signals */}
        <td className="py-2.5 px-3" style={{ width: '260px' }}>
          <div className="flex flex-wrap gap-1">
            {c.signals.map((s) => (
              <SignalChip key={s} signal={s} />
            ))}
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
          {c.assignedAnalyst ? (
            <span className="text-[#6B7280]" style={{ fontSize: '12px' }}>{c.assignedAnalyst}</span>
          ) : (
            <span className="text-[#D1D5DB]" style={{ fontSize: '12px' }}>Unassigned</span>
          )}
        </td>
      </tr>
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
              <span className="text-[#1A1E21]" style={{ fontSize: '14px', fontWeight: 600 }}>{stats.total}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FEE2E2] rounded-md">
              <span className="w-2 h-2 rounded-full bg-[#E7000B]" />
              <span className="text-[#991B1B]" style={{ fontSize: '12px' }}>Critical</span>
              <span className="text-[#991B1B]" style={{ fontSize: '14px', fontWeight: 600 }}>{stats.critical}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFF7ED] rounded-md">
              <span className="w-2 h-2 rounded-full bg-[#E17100]" />
              <span className="text-[#9A3412]" style={{ fontSize: '12px' }}>SLA Risk</span>
              <span className="text-[#9A3412]" style={{ fontSize: '14px', fontWeight: 600 }}>{stats.slaBreach}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-md border border-[#EFEFEF]">
              <Users className="w-3.5 h-3.5 text-[#6B7280]" />
              <span className="text-[#6B7280]" style={{ fontSize: '12px' }}>Unassigned</span>
              <span className="text-[#1A1E21]" style={{ fontSize: '14px', fontWeight: 600 }}>{stats.unassigned}</span>
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

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CaseStatus | 'all')}
              className="bg-white border border-[#EFEFEF] rounded-md px-2.5 py-1.5 text-[#1A1E21] outline-none cursor-pointer"
              style={{ fontSize: '12px' }}
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="in_review">In Review</option>
              <option value="escalated">Escalated</option>
              <option value="pending_info">Pending Info</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as Priority | 'all')}
              className="bg-white border border-[#EFEFEF] rounded-md px-2.5 py-1.5 text-[#1A1E21] outline-none cursor-pointer"
              style={{ fontSize: '12px' }}
            >
              <option value="all">All Priority</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <button className="flex items-center gap-1.5 bg-white border border-[#EFEFEF] rounded-md px-2.5 py-1.5 text-[#6B7280] hover:text-[#1A1E21] transition-colors" style={{ fontSize: '12px' }}>
              <SlidersHorizontal className="w-3.5 h-3.5" />
              More Filters
            </button>
          </div>

          <button
            onClick={() => nextBestCase && navigate(`/case/${nextBestCase.id}`)}
            className="ml-auto flex items-center gap-1.5 bg-[#023547] text-white rounded-md px-4 py-1.5 hover:bg-[#034b63] transition-colors"
            style={{ fontSize: '13px', fontWeight: 500 }}
          >
            <Zap className="w-3.5 h-3.5" />
            Next Best Case
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="px-6 py-3">
        <div className="bg-white rounded-lg border border-[#EFEFEF] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#EFEFEF] bg-[#FAFBFC]">
                <th className="py-2 px-3 text-left"><SortButton field="priority" label="PRIORITY" /></th>
                <th className="py-2 px-3 text-left"><SortButton field="entity" label="ENTITY" /></th>
                <th className="py-2 px-3 text-left"><SortButton field="sla" label="SLA" /></th>
                <th className="py-2 px-3 text-center"><SortButton field="risk" label="RISK" /></th>
                <th className="py-2 px-3 text-left" style={{ fontSize: '11px', fontWeight: 500, color: '#6B7280', letterSpacing: '0.03em' }}>SIGNALS</th>
                <th className="py-2 px-3 text-center" style={{ fontSize: '11px', fontWeight: 500, color: '#6B7280', letterSpacing: '0.03em' }}>EVIDENCE</th>
                <th className="py-2 px-3 text-left" style={{ fontSize: '11px', fontWeight: 500, color: '#6B7280', letterSpacing: '0.03em' }}>STATUS</th>
                <th className="py-2 px-3 text-left" style={{ fontSize: '11px', fontWeight: 500, color: '#6B7280', letterSpacing: '0.03em' }}>ANALYST</th>
              </tr>
            </thead>
            <tbody>
              {renderOrder.map((item) => {
                if (item.type === 'case') {
                  return <CaseRow key={item.case.id} c={item.case} />;
                }

                const group = item.cases;
                const isExpanded = expandedGroups.has(item.groupId);
                const leadCase = group[0];
                const minSla = Math.min(...group.map((c) => c.slaMinutesRemaining));
                const maxRisk = Math.max(...group.map((c) => c.riskScore));

                return (
                  <React.Fragment key={item.groupId}>
                    {/* Group header */}
                    <tr
                      className="bg-[#F8FAFC] border-b border-[#EFEFEF] cursor-pointer hover:bg-[#F1F5F9] transition-colors"
                      onClick={() => toggleGroup(item.groupId)}
                    >
                      <td colSpan={8} className="py-2 px-3">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-[#6B7280]" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-[#6B7280]" />
                          )}
                          <Layers className="w-4 h-4 text-[#6381F5]" />
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#1A1E21' }}>
                            {leadCase.entityName}
                          </span>
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#EFF6FF] text-[#1E40AF] rounded"
                            style={{ fontSize: '11px', fontWeight: 500 }}
                          >
                            <Layers className="w-3 h-3" />
                            {group.length} linked alerts
                          </span>
                          <span className="text-[#6B7280]" style={{ fontSize: '11px' }}>\u00b7</span>
                          <span className="text-[#6B7280]" style={{ fontSize: '11px' }}>
                            Highest risk: <span style={{ fontWeight: 600, color: maxRisk >= 80 ? '#E7000B' : '#E17100' }}>{maxRisk}</span>
                          </span>
                          <span className="text-[#6B7280]" style={{ fontSize: '11px' }}>\u00b7</span>
                          <SlaTimer minutesRemaining={minSla} totalMinutes={leadCase.slaTotalMinutes} compact />
                        </div>
                      </td>
                    </tr>
                    {/* Group children */}
                    {isExpanded &&
                      group.map((c) => <CaseRow key={c.id} c={c} isGroupChild />)}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}