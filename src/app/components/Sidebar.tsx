import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  Inbox,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Users,
  Settings,
  LogOut,
  User,
  ChevronDown,
} from 'lucide-react';
import arvaLogo from '../../assets/arva-logo.svg';
import profileImage from '../../assets/profile.jpg';
import { cases } from '../data/cases';
import { getCaseMetrics, getEffectiveInboxTotal } from '../data/caseMetrics';
import { useMergedGroups } from '../state/MergedGroupsContext';

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const signedInUser = { name: 'Tawfik Manham', role: 'AML Analyst' };
  const { mergedGroupIds } = useMergedGroups();
  const metrics = useMemo(() => getCaseMetrics(cases), []);
  const effectiveInboxTotal = useMemo(
    () => getEffectiveInboxTotal(cases, mergedGroupIds),
    [mergedGroupIds],
  );
  const navItems = useMemo(() => ([
    { icon: Inbox, label: 'Case Inbox', path: '/', count: effectiveInboxTotal },
    { icon: Users, label: 'Duplicates', path: '/duplicates', count: metrics.duplicateGroups },
    { icon: AlertTriangle, label: 'Critical', path: '/?filter=critical', count: metrics.critical },
    { icon: Clock, label: 'SLA Breach', path: '/?filter=sla', count: metrics.slaBreach },
    { icon: LayoutDashboard, label: 'My Cases', path: '/?filter=mine', count: metrics.myCases },
    { icon: CheckCircle2, label: 'Closed', path: '/?filter=closed', count: metrics.closed },
  ]), [effectiveInboxTotal, metrics]);

  useEffect(() => {
    if (!profileOpen) return;
    function onClickOutside(event: MouseEvent) {
      if (!profileRef.current) return;
      if (!profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [profileOpen]);

  return (
    <aside className="w-[220px] min-w-[220px] bg-white border-r border-[#E6E8EC] flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-2.5">
        <img
          src={arvaLogo}
          alt="Arva logo"
          className="h-5 w-auto"
          style={{ filter: 'brightness(0) saturate(100%) invert(26%) sepia(20%) saturate(1450%) hue-rotate(145deg) brightness(90%) contrast(92%)' }}
        />
        <span className="text-[#9CA3AF] ml-auto" style={{ fontSize: '11px' }}>
          v2.4
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            (item.path === '/' && location.pathname === '/' && !location.search) ||
            (item.path !== '/' && location.pathname === item.path && !item.path.includes('?')) ||
            (item.path.includes('?') && location.search === item.path.replace('/', ''));
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md transition-colors ${
                isActive
                  ? 'bg-[#F3F4F6] text-[#0B5D6B]'
                  : 'text-[#6B7280] hover:text-[#0B5D6B] hover:bg-[#F3F4F6]'
              }`}
              style={{ fontSize: '13px' }}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.count > 0 && (
                <span
                  className={`min-w-[20px] h-5 flex items-center justify-center rounded-full px-1.5 ${
                    isActive ? 'bg-[#E5E7EB] text-[#0B5D6B]' : 'bg-[#F3F4F6] text-[#6B7280]'
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
      <div className="px-5 py-4 border-t border-[#E6E8EC]">
        <div className="text-[#9CA3AF] mb-2" style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.05em' }}>
          TODAY'S QUEUE
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-[#6B7280]" style={{ fontSize: '12px' }}>
            <span>Processed</span>
            <span className="text-[#111827]" style={{ fontWeight: 500 }}>0 / {metrics.total}</span>
          </div>
          <div className="w-full h-1.5 bg-[#E6E8EC] rounded-full overflow-hidden">
            <div className="h-full bg-[#00A63E] rounded-full" style={{ width: '0%' }} />
          </div>
          <div className="flex justify-between text-[#6B7280]" style={{ fontSize: '12px' }}>
            <span>Avg. time</span>
            <span className="text-[#111827]" style={{ fontWeight: 500 }}>4m 12s</span>
          </div>
        </div>
      </div>

      {/* Bottom / Profile */}
      <div className="px-3 py-3 border-t border-[#E6E8EC]">
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[#6B7280] hover:text-[#0B5D6B] hover:bg-[#F3F4F6] transition-colors"
          >
            <img
              src={profileImage}
              alt={`${signedInUser.name} profile`}
              className="w-8 h-8 rounded-full object-cover"
            />
            <span className="flex-1 text-left">
              <div className="text-[#1A1E21]" style={{ fontSize: '12px', fontWeight: 600 }}>{signedInUser.name}</div>
              <div className="text-[#9CA3AF]" style={{ fontSize: '11px' }}>{signedInUser.role}</div>
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
          </button>

          {profileOpen && (
            <div className="absolute left-0 right-0 mb-2 bottom-full bg-white border border-[#E5E7EB] rounded-md shadow-sm p-2 z-20">
              <button className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-[#1A1E21] hover:bg-[#F3F4F6]" style={{ fontSize: '12px' }}>
                <User className="w-4 h-4 text-[#6B7280]" />
                View profile
              </button>
              <button className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-[#1A1E21] hover:bg-[#F3F4F6]" style={{ fontSize: '12px' }}>
                <Settings className="w-4 h-4 text-[#6B7280]" />
                Settings
              </button>
              <div className="my-1 h-px bg-[#E5E7EB]" />
              <button className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-[#B91C1C] hover:bg-[#FEF2F2]" style={{ fontSize: '12px' }}>
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
