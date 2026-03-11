import { Clock, AlertTriangle } from 'lucide-react';

interface SlaTimerProps {
  minutesRemaining: number;
  totalMinutes: number;
  compact?: boolean;
}

export function SlaTimer({ minutesRemaining, totalMinutes, compact = false }: SlaTimerProps) {
  const percentage = (minutesRemaining / totalMinutes) * 100;
  const hours = Math.floor(minutesRemaining / 60);
  const mins = minutesRemaining % 60;

  let urgency: 'breach' | 'critical' | 'warning' | 'safe';
  if (percentage <= 5) urgency = 'breach';
  else if (percentage <= 15) urgency = 'critical';
  else if (percentage <= 35) urgency = 'warning';
  else urgency = 'safe';

  const colors = {
    breach: { bg: '#E7000B', text: '#FFFFFF', ring: '#E7000B' },
    critical: { bg: '#FEE2E2', text: '#E7000B', ring: '#E7000B' },
    warning: { bg: '#FFF7ED', text: '#E17100', ring: '#E17100' },
    safe: { bg: '#F0FDF4', text: '#00A63E', ring: '#00A63E' },
  };

  const c = colors[urgency];
  const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  if (compact) {
    return (
      <div
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded"
        style={{ backgroundColor: c.bg, color: c.text, fontSize: '12px', fontWeight: 500 }}
      >
        {urgency === 'breach' ? (
          <AlertTriangle className="w-3 h-3" />
        ) : (
          <Clock className="w-3 h-3" />
        )}
        {timeStr}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md"
        style={{ backgroundColor: c.bg, color: c.text, fontSize: '12px', fontWeight: 500 }}
      >
        {urgency === 'breach' ? (
          <AlertTriangle className="w-3.5 h-3.5" />
        ) : (
          <Clock className="w-3.5 h-3.5" />
        )}
        <span>{timeStr}</span>
      </div>
      {/* Progress bar */}
      <div className="w-12 h-1.5 bg-[#EFEFEF] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.max(percentage, 3)}%`, backgroundColor: c.ring }}
        />
      </div>
    </div>
  );
}
