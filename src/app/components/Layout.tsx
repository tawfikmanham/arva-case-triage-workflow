import { Outlet } from 'react-router';
import { Sidebar } from './Sidebar';

export function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <Outlet />
    </div>
  );
}
