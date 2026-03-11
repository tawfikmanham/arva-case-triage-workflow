import { useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  Inbox,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Settings,
} from 'lucide-react';
import arvaLogo from '../../assets/arva-logo.svg';

const navItems = [
  { icon: Inbox, label: 'Case Inbox', path: '/', count: 13 },
  { icon: AlertTriangle, label: 'Critical', path: '/?filter=critical', count: 3 },
  { icon: Clock, label: 'SLA Breach', path: '/?filter=sla', count: 4 },
  { icon: LayoutDashboard, label: 'My Cases', path: '/?filter=mine', count: 5 },
  { icon: CheckCircle2, label: 'Closed', path: '/?filter=closed', count: 0 },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <aside className="w-[220px] min-w-[220px] bg-[#023547] flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-2.5">
        <img src={arvaLogo} alt="Arva logo" className="h-5 w-auto" />
        <span className="text-white/50 ml-auto" style={{ fontSize: '11px' }}>
          v2.4
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            (item.path === '/' && location.pathname === '/' && !location.search) ||
            (item.path !== '/' && location.search === item.path.replace('/', ''));
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md transition-colors ${
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/8'
              }`}
              style={{ fontSize: '13px' }}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.count > 0 && (
                <span
                  className={`min-w-[20px] h-5 flex items-center justify-center rounded-full px-1.5 ${
                    isActive ? 'bg-white/20' : 'bg-white/10'
                  }`}
                  style={{ fontSize: '11px' }}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Queue stats */}
      <div className="px-5 py-4 border-t border-white/10">
        <div className="text-white/40 mb-2" style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.05em' }}>
          TODAY'S QUEUE
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-white/70" style={{ fontSize: '12px' }}>
            <span>Processed</span>
            <span className="text-white" style={{ fontWeight: 500 }}>0 / 120</span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-[#00A63E] rounded-full" style={{ width: '0%' }} />
          </div>
          <div className="flex justify-between text-white/70" style={{ fontSize: '12px' }}>
            <span>Avg. time</span>
            <span className="text-white" style={{ fontWeight: 500 }}>4m 12s</span>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-white/10">
        <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-white/50 hover:text-white hover:bg-white/8 transition-colors" style={{ fontSize: '13px' }}>
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}
