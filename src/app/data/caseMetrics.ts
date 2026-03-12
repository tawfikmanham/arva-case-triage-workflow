import type { CaseItem } from './cases';

function isSlaBreach(c: CaseItem) {
  return (c.slaMinutesRemaining / c.slaTotalMinutes) <= 0.15;
}

export function getCaseMetrics(items: CaseItem[]) {
  const duplicateCases = items.filter((c) => c.duplicateGroupId);
  const duplicateGroups = new Set(
    duplicateCases.map((c) => c.duplicateGroupId).filter(Boolean) as string[],
  ).size;

  return {
    total: items.length,
    duplicates: duplicateCases.length,
    duplicateGroups,
    critical: items.filter((c) => c.priority === 'critical').length,
    slaBreach: items.filter((c) => isSlaBreach(c)).length,
    myCases: items.filter((c) => Boolean(c.assignedAnalyst)).length,
    closed: items.filter((c) => c.status === 'closed').length,
    highPriority: items.filter((c) => c.priority === 'critical' || c.priority === 'high').length,
  };
}

export function getEffectiveInboxTotal(items: CaseItem[], mergedGroupIds: Set<string>) {
  const grouped = new Map<string, number>();
  items.forEach((c) => {
    if (!c.duplicateGroupId) return;
    grouped.set(c.duplicateGroupId, (grouped.get(c.duplicateGroupId) ?? 0) + 1);
  });

  let mergedSavings = 0;
  mergedGroupIds.forEach((groupId) => {
    const count = grouped.get(groupId);
    if (count && count > 1) mergedSavings += count - 1;
  });

  return items.length - mergedSavings;
}
