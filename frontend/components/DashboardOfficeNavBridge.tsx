'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Role = 'SUPERUSER' | 'EDITOR' | 'VIEWER';

export default function DashboardOfficeNavBridge() {
  const pathname = usePathname();
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [role, setRole] = useState<Role>('VIEWER');

  useEffect(() => {
    if (pathname !== '/') {
      setContainer(null);
      return;
    }

    const findSidebar = () => {
      const sidebar = document.querySelector<HTMLElement>('.premium-sidebar');
      setContainer(sidebar);
    };

    findSidebar();
    const observer = new MutationObserver(findSidebar);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);

  useEffect(() => {
    if (pathname !== '/') return;

    const syncAuth = () => {
      const raw = sessionStorage.getItem('expiry-tracker-token');
      if (!raw) {
        setAuthenticated(false);
        setRole('VIEWER');
        return;
      }

      try {
        const payload = JSON.parse(atob(raw.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        setRole((payload.role ?? 'VIEWER') as Role);
        setAuthenticated(true);
      } catch {
        setAuthenticated(false);
        setRole('VIEWER');
      }
    };

    syncAuth();
    window.addEventListener('expiry-tracker-auth-change', syncAuth);
    return () => window.removeEventListener('expiry-tracker-auth-change', syncAuth);
  }, [pathname]);

  if (pathname !== '/' || !container || !authenticated) return null;

  return createPortal(
    <div className="dashboard-office-bridge">
      <div className="dashboard-office-label">OFFICE AUTOMATION</div>
      <nav>
        <Link href="/office"><span>▦</span><strong>Dashboard</strong></Link>
        <Link href="/office/requests"><span>◫</span><strong>{role === 'SUPERUSER' || role === 'EDITOR' ? 'Requests' : 'My Requests'}</strong></Link>
        <Link href="/office/tasks"><span>✓</span><strong>Tasks</strong></Link>
        <Link href="/office/approvals"><span>◉</span><strong>Approvals</strong></Link>
        <Link href="/office/reports"><span>▥</span><strong>Reports</strong></Link>
      </nav>
      <style>{`
        .dashboard-office-bridge {
          order: 2;
          margin-top: 22px;
          padding-top: 18px;
          border-top: 1px solid rgba(255,255,255,.08);
        }
        .dashboard-office-label {
          padding: 0 12px 9px;
          color: #6f7d92;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .13em;
        }
        .dashboard-office-bridge nav {
          display: grid;
          gap: 4px;
        }
        .dashboard-office-bridge a {
          height: 38px;
          padding: 0 12px;
          display: flex;
          align-items: center;
          gap: 12px;
          border-radius: 9px;
          color: #a6b1c1;
          text-decoration: none;
          font-size: 11px;
          font-weight: 650;
        }
        .dashboard-office-bridge a:hover {
          background: rgba(255,255,255,.06);
          color: #fff;
        }
        .dashboard-office-bridge a span {
          width: 18px;
          text-align: center;
          color: #93a2bb;
          font-size: 15px;
        }
        .dashboard-office-bridge a strong { font-weight: 650; }
        .premium-sidebar .admin-label { order: 3; }
        .premium-sidebar .admin-label + nav { order: 3; }
        .premium-sidebar .sidebar-account { order: 4; }
        @media(max-width:760px) {
          .dashboard-office-bridge { display: none; }
        }
      `}</style>
    </div>,
    container,
  );
}
