import type { Signal } from '../data/cases';

const signalConfig: Record<Signal, { bg: string; text: string }> = {
  'Sanctions Hit': { bg: '#FEE2E2', text: '#991B1B' },
  'PEP': { bg: '#FEE2E2', text: '#991B1B' },
  'Adverse Media': { bg: '#FFF7ED', text: '#9A3412' },
  'Country Risk': { bg: '#FFF7ED', text: '#9A3412' },
  'Name Match': { bg: '#EFF6FF', text: '#1E40AF' },
  'UBO Mismatch': { bg: '#FEF3C7', text: '#92400E' },
  'Shell Indicator': { bg: '#FEE2E2', text: '#991B1B' },
  'High Volume': { bg: '#F0FDF4', text: '#166534' },
};

interface SignalChipProps {
  signal: Signal;
}

export function SignalChip({ signal }: SignalChipProps) {
  const config = signalConfig[signal];
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded whitespace-nowrap"
      style={{ backgroundColor: config.bg, color: config.text, fontSize: '11px', fontWeight: 500 }}
    >
      {signal}
    </span>
  );
}
