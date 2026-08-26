'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

type Role = 'SUPERUSER' | 'EDITOR' | 'VIEWER';
type ModuleKey = 'CONTRACT_DOCUMENT' | 'OFFICE_AUTOMATION';
type ModuleAccess = { module: ModuleKey; permissions: string[] };

type OfficeLink = {
  label: string;
  href: string;
  icon: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

function decodeRole(token: string | null): Role {
  try {
    if (!token) return 'VIEWER';
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return (payload.role ?? 'VIEWER') as Role;
  } catch {
    return 'VIEWER';
  }
}

function removeMountedNav() {
  document.querySelectorAll<HTMLElement>('[data-dashboard-office-nav]').forEach((node) => node.remove());
}

function hasOfficeDashboardAccess(moduleAccess: ModuleAccess[], role: Role) {
  return role === 'SUPERUSER' || moduleAccess.some(
    (item) => item.module === 'OFFICE_AUTOMATION' && item.permissions.includes('OFFICE_DASHBOARD_VIEW'),
  );
}

async function readOfficeAccess() {
  const token = sessionStorage.getItem('expiry-tracker-token');
  if (!token) return false;

  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!response.ok) return false;

    const user = await response.json();
    return hasOfficeDashboardAccess(user.moduleAccess ?? [], user.role ?? decodeRole(token));
  } catch {
    return false;
  }
}

function mountOfficeNav(allowed: boolean) {
  const sidebar = document.querySelector<HTMLElement>('.app .sidebar');

  if (!sidebar || !allowed) {
    removeMountedNav();
    return;
  }

  const account = sidebar.querySelector<HTMLElement>('.sidebar-account');
  const existing = sidebar.querySelector<HTMLElement>('[data-dashboard-office-nav]');
  if (existing) return;

  const role = decodeRole(sessionStorage.getItem('expiry-tracker-token'));
  const lang = localStorage.getItem('expiry-tracker-language') === 'id' ? 'id' : 'en';
  const links: OfficeLink[] = [
    { label: lang === 'id' ? 'Dashboard' : 'Dashboard', href: '/office', icon: '▦' },
    { label: role === 'SUPERUSER' || role === 'EDITOR' ? 'Requests' : (lang === 'id' ? 'Request Saya' : 'My Requests'), href: '/office/requests', icon: '◫' },
    { label: lang === 'id' ? 'Task' : 'Tasks', href: '/office/tasks', icon: '✓' },
    { label: lang === 'id' ? 'Approval' : 'Approvals', href: '/office/approvals', icon: '◉' },
    { label: lang === 'id' ? 'Laporan' : 'Reports', href: '/office/reports', icon: '▥' },
  ];

  const wrapper = document.createElement('section');
  wrapper.dataset.dashboardOfficeNav = 'true';
  wrapper.setAttribute('aria-label', 'Office Automation');
  wrapper.style.cssText = 'margin-top:22px;padding-top:18px;border-top:1px solid rgba(255,255,255,.08);flex:none';

  const label = document.createElement('div');
  label.textContent = 'OFFICE AUTOMATION';
  label.style.cssText = 'padding:0 12px 9px;color:#6f7d92;font-size:9px;font-weight:800;letter-spacing:.13em;line-height:1.2';
  wrapper.appendChild(label);

  const nav = document.createElement('nav');
  nav.style.cssText = 'display:grid;gap:4px';

  for (const item of links) {
    const anchor = document.createElement('a');
    anchor.href = item.href;
    anchor.style.cssText = 'height:42px;padding:0 12px;display:flex;align-items:center;gap:12px;border-radius:9px;color:#a6b1c1;text-decoration:none;font-size:12px;font-weight:650;box-sizing:border-box;transition:background .15s,color .15s';
    anchor.addEventListener('mouseenter', () => {
      anchor.style.background = 'rgba(255,255,255,.06)';
      anchor.style.color = '#fff';
    });
    anchor.addEventListener('mouseleave', () => {
      anchor.style.background = 'transparent';
      anchor.style.color = '#a6b1c1';
    });

    const icon = document.createElement('span');
    icon.textContent = item.icon;
    icon.style.cssText = 'width:18px;text-align:center;color:#93a2bb;font-size:15px;line-height:1;flex:none';

    const text = document.createElement('span');
    text.textContent = item.label;
    text.style.cssText = 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis';

    anchor.append(icon, text);
    nav.appendChild(anchor);
  }

  wrapper.appendChild(nav);

  if (account) sidebar.insertBefore(wrapper, account);
  else sidebar.appendChild(wrapper);
}

export default function DashboardOfficeNavBridge() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== '/') {
      removeMountedNav();
      return;
    }

    let frame = 0;
    let disposed = false;

    const sync = async () => {
      const allowed = await readOfficeAccess();
      if (disposed) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => mountOfficeNav(allowed));
    };

    void sync();

    const observer = new MutationObserver(() => {
      if (document.querySelector('.app .sidebar') && !document.querySelector('[data-dashboard-office-nav]')) {
        void sync();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('expiry-tracker-auth-change', sync);
    window.addEventListener('storage', sync);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('expiry-tracker-auth-change', sync);
      window.removeEventListener('storage', sync);
      removeMountedNav();
    };
  }, [pathname]);

  return null;
}
