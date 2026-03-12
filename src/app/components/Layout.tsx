import { Outlet } from 'react-router';
import { Sidebar } from './Sidebar';

export function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 min-w-0 h-screen bg-[#F5F5F5]">
        <Outlet />
      </div>
    </div>
  );
}
