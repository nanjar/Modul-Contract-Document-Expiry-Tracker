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

function alignDashboardBrand() {
  const brand = document.querySelector<HTMLElement>('.premium-brand');
  if (!brand) return;
  const title = brand.querySelector<HTMLElement>('strong');
  const subtitle = brand.querySelector<HTMLElement>('span');
  if (title) title.textContent = 'Business Operations';
  if (subtitle) subtitle.textContent = 'Platform';
}

function mountOfficeNav() {
  const sidebar = document.querySelector<HTMLElement>('.premium-sidebar');
  const account = sidebar?.querySelector<HTMLElement>('.sidebar-account');

  if (!sidebar) {
    removeMountedNav();
    return;
  }

  alignDashboardBrand();

  if (sidebar.querySelector('[data-dashboard-office-nav]')) return;

  const role = decodeRole(sessionStorage.getItem('expiry-tracker-token'));
  const lang = localStorage.getItem('expiry-tracker-language') === 'id' ? 'id' : 'en';
  const links: OfficeLink[] = [
    { label: 'Dashboard', href: '/office', icon: '▦' },
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

  // .sidebar-account has margin-top:auto. The module menu must be inserted
  // before it; appending after it pushes the menu below the visible sidebar.
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
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(mountOfficeNav);
    };

    sync();

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('expiry-tracker-auth-change', sync);
    window.addEventListener('storage', sync);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('expiry-tracker-auth-change', sync);
      window.removeEventListener('storage', sync);
      removeMountedNav();
    };
  }, [pathname]);

  return null;
}
