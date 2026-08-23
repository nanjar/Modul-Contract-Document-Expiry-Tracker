'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

type Role = 'SUPERUSER' | 'EDITOR' | 'VIEWER';
type Source = 'topbar' | 'sidebar';

type User = { name: string; email?: string; role: Role };

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

export default function DashboardProfileBridge() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<Source>('topbar');
  const [user, setUser] = useState<User>({ name: 'User', role: 'VIEWER' });

  useEffect(() => {
    if (pathname !== '/') return;
    setUser(readUser());
    const sync = () => setUser(readUser());
    window.addEventListener('expiry-tracker-auth-change', sync);
    return () => window.removeEventListener('expiry-tracker-auth-change', sync);
  }, [pathname]);

  useEffect(() => {
    if (pathname !== '/') return;

    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const trigger = target.closest('.premium-app .header-user > button, .premium-app .sidebar-account > button');
      if (trigger) {
        event.preventDefault();
        event.stopPropagation();
        setSource(trigger.closest('.sidebar-account') ? 'sidebar' : 'topbar');
        setOpen(value => !value);
        return;
      }

      if (target.closest('[data-dashboard-profile-menu]')) return;
      setOpen(false);
    };

    document.addEventListener('click', onDocumentClick, true);
    return () => document.removeEventListener('click', onDocumentClick, true);
  }, [pathname]);

  if (pathname !== '/' || !open) return null;

  const initials = user.role === 'SUPERUSER' ? 'AD' : user.role === 'EDITOR' ? 'ED' : 'VW';
  const position = source === 'sidebar'
    ? { left: 16, bottom: 82, right: 'auto', top: 'auto' }
    : { right: 20, top: 72, left: 'auto', bottom: 'auto' };

  function signOut() {
    sessionStorage.removeItem('expiry-tracker-token');
    window.dispatchEvent(new Event('expiry-tracker-auth-change'));
    window.location.href = '/';
  }

  return <div
    data-dashboard-profile-menu
    role="menu"
    style={{
      position: 'fixed',
      ...position,
      zIndex: 10000,
      width: 280,
      padding: 8,
      border: '1px solid var(--border, #25303d)',
      borderRadius: 16,
      background: 'var(--surface, #111822)',
      boxShadow: '0 22px 55px rgba(0,0,0,.28)',
      color: 'var(--text, #142038)',
    }}
    onClick={event => event.stopPropagation()}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10 }}>
      <div className="avatar" style={{ width: 34, height: 34 }}>{initials}</div>
      <div style={{ display: 'grid', gap: 3, minWidth: 0 }}>
        <strong style={{ fontSize: 12 }}>{user.name}</strong>
        <span style={{ fontSize: 10, opacity: .65 }}>{user.role}</span>
      </div>
    </div>
    <div style={{ height: 1, background: 'var(--border, #25303d)', margin: '6px 2px' }} />
    <Link href="/profile" role="menuitem" onClick={() => setOpen(false)} style={itemStyle}>
      <span>◯</span><div><strong>Profile</strong><small>Name, email & account</small></div>
    </Link>
    <Link href="/profile#security" role="menuitem" onClick={() => setOpen(false)} style={itemStyle}>
      <span>⌑</span><div><strong>Security</strong><small>Change password</small></div>
    </Link>
    <button type="button" role="menuitem" onClick={signOut} style={itemStyle}>
      <span style={{ color: '#d55' }}>↗</span><div><strong>Sign out</strong><small>End this session</small></div>
    </button>
  </div>;
}

const itemStyle = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '11px 10px',
  border: 0,
  borderRadius: 10,
  background: 'transparent',
  color: 'inherit',
  textDecoration: 'none',
  textAlign: 'left' as const,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
