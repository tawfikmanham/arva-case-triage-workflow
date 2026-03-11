import type { Signal } from '../data/cases';

const signalConfig: Record<Signal, { bg: string; text: string; dot: string }> = {
  'Sanctions Hit': { bg: '#FEE2E2', text: '#991B1B', dot: '#E7000B' },
  'PEP': { bg: '#FEE2E2', text: '#991B1B', dot: '#E7000B' },
  'Adverse Media': { bg: '#FFF7ED', text: '#9A3412', dot: '#E17100' },
  'Country Risk': { bg: '#FFF7ED', text: '#9A3412', dot: '#E17100' },
  'Name Match': { bg: '#EFF6FF', text: '#1E40AF', dot: '#6381F5' },
  'UBO Mismatch': { bg: '#FEF3C7', text: '#92400E', dot: '#D97706' },
  'Shell Indicator': { bg: '#FEE2E2', text: '#991B1B', dot: '#E7000B' },
  'High Volume': { bg: '#F0FDF4', text: '#166534', dot: '#00A63E' },
};

interface SignalChipProps {
  signal: Signal;
}

export function SignalChip({ signal }: SignalChipProps) {
  const config = signalConfig[signal];
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded whitespace-nowrap"
      style={{ backgroundColor: config.bg, color: config.text, fontSize: '11px', fontWeight: 500 }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: config.dot }}
      />
      {signal}
    </span>
  );
}
