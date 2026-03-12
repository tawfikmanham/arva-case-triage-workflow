import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type MergedGroupsContextValue = {
  mergedGroupIds: Set<string>;
  mergeGroup: (groupId: string) => void;
  unmergeGroup: (groupId: string) => void;
  mergeAllGroups: (groupIds: string[]) => void;
};

const MergedGroupsContext = createContext<MergedGroupsContextValue | null>(null);

export function MergedGroupsProvider({ children }: { children: ReactNode }) {
  const [mergedGroupIds, setMergedGroupIds] = useState<Set<string>>(new Set());

  const value = useMemo<MergedGroupsContextValue>(() => ({
    mergedGroupIds,
    mergeGroup: (groupId: string) => {
      setMergedGroupIds((prev) => new Set(prev).add(groupId));
    },
    unmergeGroup: (groupId: string) => {
      setMergedGroupIds((prev) => {
        const next = new Set(prev);
        next.delete(groupId);
        return next;
      });
    },
    mergeAllGroups: (groupIds: string[]) => {
      setMergedGroupIds((prev) => {
        const next = new Set(prev);
        groupIds.forEach((groupId) => next.add(groupId));
        return next;
      });
    },
  }), [mergedGroupIds]);

  return (
    <MergedGroupsContext.Provider value={value}>
      {children}
    </MergedGroupsContext.Provider>
  );
}

export function useMergedGroups() {
  const ctx = useContext(MergedGroupsContext);
  if (!ctx) {
    throw new Error('useMergedGroups must be used inside MergedGroupsProvider');
  }
  return ctx;
}
