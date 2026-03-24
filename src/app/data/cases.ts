export type CaseStatus = 'new' | 'in_review' | 'escalated' | 'pending_info' | 'closed';
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type EvidenceStrength = 'high' | 'medium' | 'low';
export type Signal =
  | 'Name Match'
  | 'Country Risk'
  | 'Adverse Media'
  | 'PEP'
  | 'Sanctions Hit'
  | 'UBO Mismatch'
  | 'High Volume'
  | 'Shell Indicator';

export interface CaseItem {
  id: string;
  entityName: string;
  entityType: string;
  signals: Signal[];
  evidenceStrength: EvidenceStrength;
  riskScore: number;
  priority: Priority;
  slaMinutesRemaining: number;
  slaTotalMinutes: number;
  status: CaseStatus;
  assignedAnalyst: string | null;
  duplicateGroupId: string | null;
  duplicateCount: number;
  createdAt: string;
  country: string;
  caseType: string;
}

const signalsPool: Signal[] = [
  'Name Match',
  'Country Risk',
  'Adverse Media',
  'PEP',
  'Sanctions Hit',
  'UBO Mismatch',
  'High Volume',
  'Shell Indicator',
];

const countries = ['GB', 'US', 'CY', 'AE', 'RU', 'IR', 'SG', 'VG', 'MM', 'UA', 'NO', 'HK'];
const caseTypes = ['AML Alert', 'KYC Review', 'Sanctions Screening', 'Transaction Monitoring'];
const entityTypes = ['Corporate', 'Individual'];
const analysts = ['Sarah Chen', 'Marcus Reid', 'Liam Patel', 'Nora Ali'];

const DUPLICATE_ENTITY_NAME = 'ACME LTD';
const DUPLICATE_ENTITY_COUNTRY = 'US';
const TARGET_DUPLICATE_CASES = 30;
const TARGET_SLA_BREACH_CASES = 15;

function inferEntityType(entityName: string): (typeof entityTypes)[number] {
  const corporatePattern = /\b(ltd|limited|llc|inc|corp|co|company|group|holdings|capital|partners|ventures|logistics|finance|trading|shipping|consulting)\b/i;
  if (corporatePattern.test(entityName)) return 'Corporate';
  return 'Individual';
}

let seed = 42;
function rng() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function pickUniqueSignals(count: number) {
  const pool = [...signalsPool];
  const selected: Signal[] = [];
  while (selected.length < count && pool.length) {
    const idx = Math.floor(rng() * pool.length);
    selected.push(pool.splice(idx, 1)[0]);
  }
  return selected;
}

function riskScoreFor(priority: Priority) {
  if (priority === 'critical') return Math.floor(85 + rng() * 15);
  if (priority === 'high') return Math.floor(70 + rng() * 15);
  if (priority === 'medium') return Math.floor(45 + rng() * 25);
  return Math.floor(20 + rng() * 20);
}

function evidenceForSignals(count: number): EvidenceStrength {
  if (count >= 3) return rng() > 0.2 ? 'high' : 'medium';
  if (count === 2) return rng() > 0.5 ? 'medium' : 'low';
  return 'low';
}

function statusForIndex(i: number): CaseStatus {
  if (i < 80) return 'new';
  if (i < 95) return 'in_review';
  if (i < 105) return 'pending_info';
  if (i < 115) return 'escalated';
  return 'closed';
}

function makeId(i: number) {
  return `AML-2026-${4800 + i}`;
}

function makeCreatedAt(i: number) {
  const base = new Date('2026-03-11T07:00:00Z');
  base.setMinutes(base.getMinutes() - i * 7);
  return base.toISOString();
}

const cases: CaseItem[] = [];
let idx = 0;

// 30 duplicates for one single entity.
for (let k = 0; k < TARGET_DUPLICATE_CASES; k += 1) {
  const isHighPriority = idx < 15;
  const priority: Priority = idx < 5 ? 'critical' : idx < 15 ? 'high' : 'medium';
  const signalsCount = 1 + Math.floor(rng() * 4);
  const signals = pickUniqueSignals(signalsCount);
  const slaTotalMinutes = isHighPriority ? 240 : 480;
  const slaMinutesRemaining = isHighPriority
    ? 10 + Math.floor(rng() * 50)
    : 180 + Math.floor(rng() * 240);

  cases.push({
    id: makeId(idx),
    entityName: DUPLICATE_ENTITY_NAME,
    entityType: inferEntityType(DUPLICATE_ENTITY_NAME),
    signals,
    evidenceStrength: evidenceForSignals(signals.length),
    riskScore: riskScoreFor(priority),
    priority,
    slaMinutesRemaining,
    slaTotalMinutes,
    status: statusForIndex(idx),
    assignedAnalyst: statusForIndex(idx) === 'new' ? null : pick(analysts),
    duplicateGroupId: 'grp-1',
    duplicateCount: TARGET_DUPLICATE_CASES,
    createdAt: makeCreatedAt(idx),
    country: DUPLICATE_ENTITY_COUNTRY,
    caseType: pick(caseTypes),
  });

  idx += 1;
}

// 90 standalone cases
for (let i = 0; i < 90; i += 1) {
  const isHighPriority = idx < 15;
  const priority: Priority = idx < 5 ? 'critical' : idx < 15 ? 'high' : rng() > 0.5 ? 'medium' : 'low';
  const signalsCount = 1 + Math.floor(rng() * 4);
  const signals = pickUniqueSignals(signalsCount);
  const slaTotalMinutes = isHighPriority ? 240 : 480;
  const slaMinutesRemaining = isHighPriority
    ? 10 + Math.floor(rng() * 50)
    : 180 + Math.floor(rng() * 240);

  const entityName = `${pick(['Atlas', 'Orion', 'Nimbus', 'Helix', 'Pioneer', 'Vertex', 'Everest', 'Axiom', 'Lumen', 'Cedar'])} ${pick(['Holdings', 'Capital', 'Logistics', 'Trading', 'Ventures', 'Group', 'Partners'])} ${idx}`;
  cases.push({
    id: makeId(idx),
    entityName,
    entityType: inferEntityType(entityName),
    signals,
    evidenceStrength: evidenceForSignals(signals.length),
    riskScore: riskScoreFor(priority),
    priority,
    slaMinutesRemaining,
    slaTotalMinutes,
    status: statusForIndex(idx),
    assignedAnalyst: statusForIndex(idx) === 'new' ? null : pick(analysts),
    duplicateGroupId: null,
    duplicateCount: 0,
    createdAt: makeCreatedAt(idx),
    country: pick(countries),
    caseType: pick(caseTypes),
  });

  idx += 1;
}

// Ensure exactly 15 SLA-breach cases for dashboard and inbox filtering demos.
cases.forEach((c, i) => {
  if (i < TARGET_SLA_BREACH_CASES) {
    c.slaTotalMinutes = 240;
    c.slaMinutesRemaining = 12 + (i % 20); // Always <= 15% of total.
    return;
  }
  if ((c.slaMinutesRemaining / c.slaTotalMinutes) <= 0.15) {
    c.slaMinutesRemaining = Math.ceil(c.slaTotalMinutes * 0.2);
  }
});

export { cases };

export const statusLabels: Record<CaseStatus, string> = {
  new: 'New',
  in_review: 'In Review',
  escalated: 'Escalated',
  pending_info: 'Pending Info',
  closed: 'Closed',
};

export const priorityOrder: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};
