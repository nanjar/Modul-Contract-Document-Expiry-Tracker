'use client';

import { FormEvent, ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from './LanguageProvider';

type Role = 'SUPERUSER' | 'EDITOR' | 'VIEWER';
type Props = { children: ReactNode };
type SessionUser = { name: string; role: Role };

const nav = [
  ['overview', '/', 'home'],
  ['documents', '/documents', 'document'],
  ['reminders', '/reminders', 'bell'],
  ['archived', '/documents?status=ARCHIVED', 'archive'],
  ['audit', '/audit', 'audit'],
] as const;

const copy = {
  en: {
    overview: 'Overview', documents: 'Documents', reminders: 'Reminders', archived: 'Archived', audit: 'Audit log',
    users: 'Users', settings: 'Settings', search: 'Search documents, numbers, counterparties…', language: 'Language',
    dark: 'Dark', light: 'Light', signOut: 'Sign out',
  },
  id: {
    overview: 'Ringkasan', documents: 'Dokumen', reminders: 'Pengingat', archived: 'Diarsipkan', audit: 'Log audit',
    users: 'Pengguna', settings: 'Pengaturan', search: 'Cari dokumen, nomor, pihak terkait…', language: 'Bahasa',
    dark: 'Gelap', light: 'Terang', signOut: 'Keluar',
  },
} as const;
type Key = keyof typeof copy.en;

function sessionUserFromToken(): SessionUser {
  try {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('expiry-tracker-token') : null;
    if (!token) return { name: 'User', role: 'VIEWER' };
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return { name: payload.name ?? payload.email ?? 'User', role: (payload.role ?? 'VIEWER') as Role };
  } catch {
    return { name: 'User', role: 'VIEWER' };
  }
}

function Icon({ name }: { name: string }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (name === 'home') return <svg {...common}><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10Z" /></svg>;
  if (name === 'document') return <svg {...common}><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 12h6M9 16h6" /></svg>;
  if (name === 'bell') return <svg {...common}><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>;
  if (name === 'archive') return <svg {...common}><path d="M4 7h16v13H4zM3 4h18v3H3zM9 11h6" /></svg>;
  if (name === 'audit') return <svg {...common}><path d="M7 3h10v18H7zM10 7h4M10 11h4M10 15h3" /></svg>;
  if (name === 'users') return <svg {...common}><path d="M16 20v-1.5a4.5 4.5 0 0 0-9 0V20M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM18 11a3 3 0 1 0 0-6M20 20v-1a4 4 0 0 0-3-3.9" /></svg>;
  if (name === 'search') return <svg {...common}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1-1.8 1.8-.1-.1a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1.1 1.7v.2h-2.6v-.2a1.8 1.8 0 0 0-1.1-1.7 1.8 1.8 0 0 0-2 .4l-.1.1-1.8-1.8.1-.1a1.8 1.8 0 0 0 .4-2A1.8 1.8 0 0 0 6 13.9h-.2v-2.6H6a1.8 1.8 0 0 0 1.7-1.1 1.8 1.8 0 0 0-.4-2l-.1-.1L9 6.3l.1.1a1.8 1.8 0 0 0 2 .4A1.8 1.8 0 0 0 12.2 5v-.2h2.6V5a1.8 1.8 0 0 0 1.1 1.7 1.8 1.8 0 0 0 2-.4l.1-.1 1.8 1.8-.1.1a1.8 1.8 0 0 0-.4 2 1.8 1.8 0 0 0 1.7 1.1h.2v2.6H21a1.8 1.8 0 0 0-1.6 1.2Z" /></svg>;
}

function Brand() {
  return <span className="chrome-brand-icon"><svg viewBox="0 0 48 48" fill="none"><rect x="2" y="2" width="44" height="44" rx="13" fill="#4C6FFF" /><path d="M16 11h11l7 7v19H16V11Z" fill="white" /><path d="M27 11v8h8" fill="white" fillOpacity=".7" /><path d="m24 24 2.8 2.8L33 20.6" stroke="#4E6BFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></span>;
}

export default function WorkspaceChrome({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang } = useLanguage();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [role, setRole] = useState<Role>('VIEWER');
  const [userName, setUserName] = useState('User');
  const [query, setQuery] = useState('');
  const [archiveActive, setArchiveActive] = useState(false);
  const t = (key: Key) => copy[lang][key];

  useEffect(() => {
    const saved = localStorage.getItem('expiry-tracker-theme');
    if (saved === 'light' || saved === 'dark') setTheme(saved);
    const sessionUser = sessionUserFromToken();
    setRole(sessionUser.role);
    setUserName(sessionUser.name);
    const syncAuth = () => {
      const next = sessionUserFromToken();
      setRole(next.role);
      setUserName(next.name);
    };
    window.addEventListener('expiry-tracker-auth-change', syncAuth);
    return () => window.removeEventListener('expiry-tracker-auth-change', syncAuth);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.appTheme = theme;
    localStorage.setItem('expiry-tracker-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (pathname !== '/documents') {
      setQuery('');
      setArchiveActive(false);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setQuery(params.get('search') ?? '');
    setArchiveActive(params.get('status') === 'ARCHIVED');
  }, [pathname]);

  useEffect(() => {
    if (pathname === '/documents') return;
    const value = query.trim();
    if (!value) return;
    const timer = window.setTimeout(() => {
      router.push(`/documents?search=${encodeURIComponent(value)}`);
      window.dispatchEvent(new CustomEvent('expiry-tracker-route-change'));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [query, router, pathname]);

  useEffect(() => {
    const syncDocumentRoute = () => {
      if (pathname !== '/documents') return;
      const params = new URLSearchParams(window.location.search);
      setQuery(params.get('search') ?? '');
      setArchiveActive(params.get('status') === 'ARCHIVED');
    };
    syncDocumentRoute();
    const handleRouteChange = () => syncDocumentRoute();
    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('expiry-tracker-route-change', handleRouteChange);
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('expiry-tracker-route-change', handleRouteChange);
    };
  }, [pathname]);

  if (pathname === '/') return <>{children}</>;

  function navigate() {
    window.setTimeout(() => window.dispatchEvent(new CustomEvent('expiry-tracker-route-change')), 0);
  }

  function search(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
    if (pathname !== '/documents') {
      if (value) router.push(`/documents?search=${encodeURIComponent(value)}`);
      else router.push('/documents');
    } else {
      const params = new URLSearchParams(window.location.search);
      if (value) params.set('search', value); else params.delete('search');
      const nextQuery = params.toString();
      router.push(`/documents${nextQuery ? `?${nextQuery}` : ''}`);
    }
    window.dispatchEvent(new CustomEvent('expiry-tracker-search', { detail: value }));
    window.setTimeout(() => window.dispatchEvent(new CustomEvent('expiry-tracker-route-change')), 0);
  }

  function logout() {
    sessionStorage.removeItem('expiry-tracker-token');
    window.dispatchEvent(new Event('expiry-tracker-auth-change'));
    router.push('/');
  }

  const initials = role === 'SUPERUSER' ? 'AD' : role === 'EDITOR' ? 'ED' : 'VW';
  const active = (href: string) => href === '/documents?status=ARCHIVED'
    ? pathname === '/documents' && archiveActive
    : pathname === href;

  return <div className="workspace-chrome" data-theme={theme}>
    <aside className="chrome-sidebar">
      <div className="chrome-brand"><Brand /><span>Expiry Tracker</span></div>
      <div className="chrome-section-label">{lang === 'id' ? 'UMUM' : 'GENERAL'}</div>
      <nav className="chrome-nav">
        {nav.map(([key, href, icon]) => <Link key={href} href={href} onClick={navigate} className={`chrome-nav-item ${active(href) ? 'active' : ''}`}><Icon name={icon} /><span>{t(key)}</span></Link>)}
      </nav>
      {role === 'SUPERUSER' && <>
        <div className="chrome-section-label admin">{lang === 'id' ? 'ADMINISTRASI' : 'ADMINISTRATION'}</div>
        <nav className="chrome-nav">
          <Link href="/users" onClick={navigate} className={`chrome-nav-item ${active('/users') ? 'active' : ''}`}><Icon name="users" /><span>{t('users')}</span></Link>
          <Link href="/settings" onClick={navigate} className={`chrome-nav-item ${active('/settings') ? 'active' : ''}`}><Icon name="settings" /><span>{t('settings')}</span></Link>
        </nav>
      </>}
      <div className="chrome-user"><div className="chrome-avatar">{initials}</div><div className="chrome-user-meta"><strong>{userName}</strong><span>{role}</span></div><button onClick={logout} title={t('signOut')}>↗</button></div>
    </aside>
    <section className="chrome-main">
      <header className="chrome-topbar">
        <form onSubmit={search} className="chrome-search"><Icon name="search" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={t('search')} /><kbd>⌘ K</kbd></form>
        <div className="chrome-top-actions">
          <button type="button" className="chrome-icon-button" aria-label={lang === 'id' ? 'Notifikasi' : 'Notifications'}>♧</button>
          <button type="button" className="chrome-theme-button" onClick={() => setTheme(value => value === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? '☼' : '☾'} {theme === 'dark' ? t('dark') : t('light')}</button>
          <button type="button" className="chrome-theme-button" onClick={() => setLang(lang === 'id' ? 'en' : 'id')} aria-label={t('language')}>{lang.toUpperCase()}</button>
          <div className="chrome-profile"><div className="chrome-avatar small">{initials}</div><div><strong>{userName}</strong><span>{role}</span></div><span>⌄</span></div>
        </div>
      </header>
      <div className="chrome-content">{children}</div>
    </section>
  </div>;
}
