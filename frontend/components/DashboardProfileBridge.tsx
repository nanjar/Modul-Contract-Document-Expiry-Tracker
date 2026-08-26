'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Role = 'SUPERUSER' | 'EDITOR' | 'VIEWER';
type Source = 'topbar' | 'sidebar';
type ModuleKey = 'CONTRACT_DOCUMENT' | 'OFFICE_AUTOMATION';
type ModuleAccess = { module: ModuleKey; permissions: string[] };
type User = { name: string; email?: string; role: Role };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

function readUser(): User {
  try {
    const token = sessionStorage.getItem('expiry-tracker-token');
    if (!token) return { name: 'User', role: 'VIEWER' };
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return { name: payload.name ?? payload.email ?? 'User', email: payload.email, role: payload.role ?? 'VIEWER' };
  } catch {
    return { name: 'User', role: 'VIEWER' };
  }
}

const menuCopyStyle = { minWidth: 0, width: '100%', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gridTemplateRows: 'auto auto', alignContent: 'center', justifyItems: 'start', gap: 3, overflow: 'hidden' };
const menuTitleStyle = { display: 'block', margin: 0, padding: 0, fontSize: 14, fontWeight: 750, lineHeight: 1.25, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' };
const menuDescriptionStyle = { display: 'block', margin: 0, padding: 0, fontSize: 11, fontWeight: 500, lineHeight: 1.3, color: 'var(--muted, #8994a7)', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' };
const itemStyle = { width: '100%', minHeight: 58, display: 'grid', gridTemplateColumns: '22px minmax(0, 1fr)', alignItems: 'center', columnGap: 12, padding: '10px', boxSizing: 'border-box' as const, border: 0, borderRadius: 10, background: 'transparent', color: 'inherit', textDecoration: 'none', textAlign: 'left' as const, cursor: 'pointer', fontFamily: 'inherit' };

export default function DashboardProfileBridge() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<Source>('topbar');
  const [user, setUser] = useState<User>({ name: 'User', role: 'VIEWER' });

  useEffect(() => {
    if (pathname !== '/') return;

    const applyModuleVisibility = (access: ModuleAccess[], role: Role) => {
      const superuser = role === 'SUPERUSER';
      const documentsAccess = superuser || access.some((item) => item.module === 'CONTRACT_DOCUMENT' && item.permissions.includes('DOCUMENT_VIEW'));
      const officeAccess = superuser || access.some((item) => item.module === 'OFFICE_AUTOMATION' && item.permissions.includes('OFFICE_DASHBOARD_VIEW'));
      const selectors = [
        ...(!documentsAccess ? ['.app .nav-item[href="/documents"]', '.app .nav-item[href="/reminders"]', '.app .nav-item[href^="/documents?"]', '.app .kpi[href="/documents"]', '.app .kpi[href^="/documents?"]', '.app .documents-panel', '.app .recent-docs', '.app .heading-actions a[href="/documents/new"]', '.app .quick-grid a[href^="/documents"]'] : []),
        ...(!officeAccess ? ['.app .nav-item[href^="/office"]', '.app .kpi[href^="/office"]', '.app .operations', '.app .integration', '.app .heading-actions a[href^="/office"]', '.app .quick-grid a[href^="/office"]'] : []),
      ];
      const hidden = new Set(selectors);
      document.querySelectorAll('.app .nav-item, .app .kpi, .app .documents-panel, .app .recent-docs, .app .operations, .app .integration, .app .heading-actions a, .app .quick-grid a').forEach((element) => {
        const selector = [...hidden].find((value) => { try { return element.matches(value); } catch { return false; } });
        if (selector) {
          (element as HTMLElement).style.display = 'none';
          element.setAttribute('data-module-hidden', 'true');
        } else if (element.getAttribute('data-module-hidden') === 'true') {
          (element as HTMLElement).style.removeProperty('display');
          element.removeAttribute('data-module-hidden');
        }
      });
    };

    const loadAccess = async (currentToken: string | null) => {
      if (!currentToken) { applyModuleVisibility([], 'VIEWER'); return; }
      try {
        const response = await fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${currentToken}` }, cache: 'no-store' });
        if (!response.ok) throw new Error('auth');
        const payload = await response.json();
        const fallback = readUser();
        const nextRole = (payload.role ?? fallback.role) as Role;
        setUser({ name: payload.name ?? fallback.name, email: payload.email, role: nextRole });
        applyModuleVisibility(payload.moduleAccess ?? [], nextRole);
      } catch { applyModuleVisibility([], 'VIEWER'); }
    };

    setUser(readUser());
    void loadAccess(sessionStorage.getItem('expiry-tracker-token'));
    const sync = () => {
      setUser(readUser());
      const currentToken = sessionStorage.getItem('expiry-tracker-token');
      void loadAccess(currentToken);
      window.setTimeout(() => void loadAccess(currentToken), 150);
    };
    window.addEventListener('expiry-tracker-auth-change', sync);
    return () => window.removeEventListener('expiry-tracker-auth-change', sync);
  }, [pathname]);

  useEffect(() => {
    if (pathname !== '/') return;
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const trigger = target.closest('.premium-app .header-user > button, .premium-app .sidebar-account > button, .app .user > button, .app .sidebar-account > button');
      if (trigger) {
        event.preventDefault(); event.stopPropagation(); setSource(trigger.closest('.sidebar-account') ? 'sidebar' : 'topbar'); setOpen(value => !value); return;
      }
      if (target.closest('[data-dashboard-profile-menu]')) return;
      setOpen(false);
    };
    document.addEventListener('click', onDocumentClick, true);
    return () => document.removeEventListener('click', onDocumentClick, true);
  }, [pathname]);

  if (pathname !== '/' || !open) return null;
  const initials = user.role === 'SUPERUSER' ? 'AD' : user.role === 'EDITOR' ? 'ED' : 'VW';
  const position = source === 'sidebar' ? { left: 16, bottom: 82, right: 'auto', top: 'auto' } : { right: 20, top: 72, left: 'auto', bottom: 'auto' };
  function signOut() { sessionStorage.removeItem('expiry-tracker-token'); window.dispatchEvent(new Event('expiry-tracker-auth-change')); window.location.href = '/'; }
  const renderMenuItem = (href: string, icon: string, title: string, description: string) => <Link href={href} role="menuitem" onClick={() => setOpen(false)} style={itemStyle}><span style={{ width: 22, height: 22, display: 'grid', placeItems: 'center', flex: '0 0 22px', fontSize: 18, lineHeight: 1 }}>{icon}</span><span style={menuCopyStyle}><strong style={menuTitleStyle}>{title}</strong><small style={menuDescriptionStyle}>{description}</small></span></Link>;

  return <div data-dashboard-profile-menu role="menu" style={{ position: 'fixed', ...position, zIndex: 10000, width: 320, maxWidth: 'calc(100vw - 24px)', minWidth: 280, padding: 12, boxSizing: 'border-box', border: '1px solid var(--border, #25303d)', borderRadius: 16, background: 'var(--surface, #111822)', boxShadow: '0 22px 55px rgba(0,0,0,.28)', color: 'var(--text, #142038)', overflow: 'hidden' }} onClick={event => event.stopPropagation()}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10 }}><div className="avatar" style={{ width: 34, height: 34 }}>{initials}</div><div style={{ display: 'grid', gap: 3, minWidth: 0, flex: '1 1 auto' }}><strong style={{ fontSize: 12, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</strong><span style={{ fontSize: 10, lineHeight: 1.25, opacity: .65 }}>{user.role}</span></div></div>
    <div style={{ height: 1, background: 'var(--border, #25303d)', margin: '6px 2px' }} />
    {renderMenuItem('/profile', '◯', 'Profile', 'Name, email & account')}
    {renderMenuItem('/profile#security', '⌑', 'Security', 'Change password')}
    <button type="button" role="menuitem" onClick={signOut} style={itemStyle}><span style={{ width: 22, height: 22, display: 'grid', placeItems: 'center', flex: '0 0 22px', color: '#d55', fontSize: 18, lineHeight: 1 }}>↗</span><span style={menuCopyStyle}><strong style={menuTitleStyle}>Sign out</strong><small style={menuDescriptionStyle}>End this session</small></span></button>
  </div>;
}
