'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

type Role = 'SUPERUSER' | 'EDITOR' | 'VIEWER';

type OfficeLink = {
  label: string;
  href: string;
  icon: string;
};

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

function mountOfficeNav() {
  removeMountedNav();

  const token = sessionStorage.getItem('expiry-tracker-token');
  const sidebar = document.querySelector<HTMLElement>('.premium-sidebar');
  if (!token || !sidebar) return;

  const role = decodeRole(token);
  const lang = localStorage.getItem('expiry-tracker-language') === 'id' ? 'id' : 'en';
  const links: OfficeLink[] = [
    { label: lang === 'id' ? 'Dashboard' : 'Dashboard', href: '/office', icon: '▦' },
    { label: role === 'SUPERUSER' || role === 'EDITOR' ? (lang === 'id' ? 'Requests' : 'Requests') : (lang === 'id' ? 'Request Saya' : 'My Requests'), href: '/office/requests', icon: '◫' },
    { label: lang === 'id' ? 'Task' : 'Tasks', href: '/office/tasks', icon: '✓' },
    { label: lang === 'id' ? 'Approval' : 'Approvals', href: '/office/approvals', icon: '◉' },
    { label: lang === 'id' ? 'Laporan' : 'Reports', href: '/office/reports', icon: '▥' },
  ];

  const wrapper = document.createElement('section');
  wrapper.dataset.dashboardOfficeNav = 'true';
  wrapper.setAttribute('aria-label', 'Office Automation');
  wrapper.style.cssText = [
    'margin-top:22px',
    'padding-top:18px',
    'border-top:1px solid rgba(255,255,255,.08)',
    'flex:none',
  ].join(';');

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
  sidebar.appendChild(wrapper);
}

export default function DashboardOfficeNavBridge() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== '/') {
      removeMountedNav();
      return;
    }

    const sync = () => window.requestAnimationFrame(mountOfficeNav);
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('expiry-tracker-auth-change', sync);
    window.addEventListener('storage', sync);

    return () => {
      observer.disconnect();
      window.removeEventListener('expiry-tracker-auth-change', sync);
      window.removeEventListener('storage', sync);
      removeMountedNav();
    };
  }, [pathname]);

  return null;
}
