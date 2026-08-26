'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Lang = 'en' | 'id';
type Theme = 'dark' | 'light';
type Role = 'SUPERUSER' | 'EDITOR' | 'VIEWER';
type Status = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'NO_EXPIRY' | 'ARCHIVED';

type DocumentSummary = { total: number; active: number; expiringSoon: number; expired: number; noExpiry: number };
type DocumentItem = { id: string; title: string; documentType: string; counterparty?: string | null; expiryDate?: string | null; status: Status; updatedAt?: string; createdAt?: string };
type OfficeActivity = { id: string; action: string; createdAt: string; request: { id: string; requestNumber: string; title: string; status: string } };
type OfficeDashboard = {
  pendingRequests: number;
  pendingApprovals: number;
  openTasks: number;
  overdueTasks: number;
  myRequests: number;
  myTasks: number;
  totalRequests: number;
  completedRequests: number;
  completionRate: number;
  integration: { pending: number; processing: number; failed: number; delivered: number; healthy: boolean };
  recentActivity: OfficeActivity[];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
const emptyDocuments: DocumentSummary = { total: 0, active: 0, expiringSoon: 0, expired: 0, noExpiry: 0 };
const emptyOffice: OfficeDashboard = {
  pendingRequests: 0, pendingApprovals: 0, openTasks: 0, overdueTasks: 0, myRequests: 0, myTasks: 0,
  totalRequests: 0, completedRequests: 0, completionRate: 0,
  integration: { pending: 0, processing: 0, failed: 0, delivered: 0, healthy: true },
  recentActivity: [],
};

const copy = {
  en: {
    product: 'Business Operations Platform', secure: 'SECURE BUSINESS WORKSPACE', welcome: 'Welcome back', signInAccount: 'Sign in to continue to your business workspace.', email: 'Email', password: 'Password', signIn: 'Sign in', signingIn: 'Signing in…', loginFailed: 'Login failed', protected: 'Protected by JWT authentication and server-side role enforcement.',
    overview: 'Overview', command: 'Business command center', dashboardTitle: 'Business Operations', dashboardCopy: 'Run documents, requests, tasks, approvals and integrations from one workspace.',
    documents: 'Documents', reminders: 'Reminders', archived: 'Archived', totalDocuments: 'Total documents', activeDocuments: 'Active documents', expiringSoon: 'Expiring soon', expired: 'Expired', within30: 'Within 30 days', requireAction: 'Require immediate action',
    office: 'Office Automation', officeDashboard: 'Dashboard', requests: 'My Requests', tasks: 'Tasks', approvals: 'Approvals', reports: 'Reports',
    pendingRequests: 'Pending requests', openTasks: 'Open tasks', pendingApprovals: 'Pending approvals', overdueTasks: 'Overdue tasks', myRequests: 'My active requests', myTasks: 'My active tasks',
    operationalWork: 'Operational work', operationalSub: 'Requests, approvals and tasks that need attention.', recentActivity: 'Recent activity', recentActivitySub: 'Latest changes across Office Automation.',
    integrationHealth: 'Integration health', integrationSub: 'n8n and external notification delivery.', healthy: 'Healthy', attention: 'Needs attention', pendingEvents: 'Pending events', failedEvents: 'Failed events', deliveredEvents: 'Delivered events',
    documentsPanel: 'Document expiry', documentsPanelSub: 'Important documents requiring attention.', viewAll: 'View all', noExpiry: 'No expiry', noAttention: 'No documents need immediate attention.',
    quickActions: 'Quick actions', addDocument: 'Add document', newRequest: 'New request', viewTasks: 'View tasks', viewApprovals: 'View approvals',
    recentRequests: 'Request activity', completion: 'Completion', trackedRequests: 'requests tracked',
    administration: 'Administration', users: 'Users', audit: 'Audit log', settings: 'Settings',
    language: 'Language', light: 'Light', dark: 'Dark', logout: 'Sign out', search: 'Search documents, numbers, counterparties…', day: 'day', days: 'days',
    statusPending: 'Pending', statusApproved: 'Approved', statusRejected: 'Rejected', statusInProgress: 'In progress', statusCompleted: 'Completed',
  },
  id: {
    product: 'Business Operations Platform', secure: 'RUANG KERJA OPERASIONAL', welcome: 'Selamat datang kembali', signInAccount: 'Masuk untuk melanjutkan ke workspace bisnis Anda.', email: 'Email', password: 'Kata sandi', signIn: 'Masuk', signingIn: 'Sedang masuk…', loginFailed: 'Login gagal', protected: 'Dilindungi autentikasi JWT dan penegakan role di sisi server.',
    overview: 'Ringkasan', command: 'Pusat kendali bisnis', dashboardTitle: 'Business Operations', dashboardCopy: 'Kelola dokumen, request, task, approval, dan integrasi dari satu workspace.',
    documents: 'Dokumen', reminders: 'Pengingat', archived: 'Diarsipkan', totalDocuments: 'Total dokumen', activeDocuments: 'Dokumen aktif', expiringSoon: 'Segera berakhir', expired: 'Sudah berakhir', within30: 'Dalam 30 hari', requireAction: 'Perlu tindakan segera',
    office: 'Office Automation', officeDashboard: 'Dashboard', requests: 'Request Saya', tasks: 'Task', approvals: 'Approval', reports: 'Laporan',
    pendingRequests: 'Request pending', openTasks: 'Task terbuka', pendingApprovals: 'Approval pending', overdueTasks: 'Task terlambat', myRequests: 'Request aktif saya', myTasks: 'Task aktif saya',
    operationalWork: 'Pekerjaan operasional', operationalSub: 'Request, approval, dan task yang membutuhkan perhatian.', recentActivity: 'Aktivitas terbaru', recentActivitySub: 'Perubahan terbaru di Office Automation.',
    integrationHealth: 'Kesehatan integrasi', integrationSub: 'n8n dan pengiriman notifikasi eksternal.', healthy: 'Sehat', attention: 'Perlu perhatian', pendingEvents: 'Event pending', failedEvents: 'Event gagal', deliveredEvents: 'Event terkirim',
    documentsPanel: 'Masa berlaku dokumen', documentsPanelSub: 'Dokumen penting yang membutuhkan perhatian.', viewAll: 'Lihat semua', noExpiry: 'Tanpa masa berlaku', noAttention: 'Tidak ada dokumen yang membutuhkan tindakan segera.',
    quickActions: 'Aksi cepat', addDocument: 'Tambah dokumen', newRequest: 'Request baru', viewTasks: 'Lihat task', viewApprovals: 'Lihat approval',
    recentRequests: 'Aktivitas request', completion: 'Penyelesaian', trackedRequests: 'request tercatat',
    administration: 'Administrasi', users: 'Pengguna', audit: 'Log audit', settings: 'Pengaturan',
    language: 'Bahasa', light: 'Terang', dark: 'Gelap', logout: 'Keluar', search: 'Cari dokumen, nomor, pihak terkait…', day: 'hari', days: 'hari',
    statusPending: 'Pending', statusApproved: 'Disetujui', statusRejected: 'Ditolak', statusInProgress: 'Diproses', statusCompleted: 'Selesai',
  },
} as const;
type Key = keyof typeof copy.en;

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (name === 'home') return <svg {...p}><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10Z" /></svg>;
  if (name === 'doc') return <svg {...p}><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 12h6M9 16h5" /></svg>;
  if (name === 'bell') return <svg {...p}><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>;
  if (name === 'archive') return <svg {...p}><path d="M4 7h16v13H4zM3 4h18v3H3zM9 11h6" /></svg>;
  if (name === 'audit') return <svg {...p}><path d="M7 3h10v18H7zM10 7h4M10 11h4M10 15h3" /></svg>;
  if (name === 'users') return <svg {...p}><circle cx="9" cy="8" r="3" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 5a3 3 0 0 1 0 6M17 14a4.5 4.5 0 0 1 4 6" /></svg>;
  if (name === 'settings') return <svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1-1.8 1.8-.1-.1a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1.1 1.7v.2h-2.6v-.2a1.8 1.8 0 0 0-1.1-1.7 1.8 1.8 0 0 0-2 .4l-.1.1-1.8-1.8.1-.1a1.8 1.8 0 0 0 .4-2A1.8 1.8 0 0 0 6 13.9h-.2v-2.6H6a1.8 1.8 0 0 0 1.7-1.1 1.8 1.8 0 0 0-.4-2l-.1-.1L9 6.3l.1.1a1.8 1.8 0 0 0 2 .4A1.8 1.8 0 0 0 12.2 5v-.2h2.6V5a1.8 1.8 0 0 0 1.1 1.7 1.8 1.8 0 0 0 2-.4l.1-.1 1.8 1.8-.1.1a1.8 1.8 0 0 0-.4 2 1.8 1.8 0 0 0 1.7 1.1h.2v2.6H21a1.8 1.8 0 0 0-1.6 1.2Z" /></svg>;
  if (name === 'office') return <svg {...p}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 8h8M8 12h3M13 12h3M8 16h8" /></svg>;
  if (name === 'request') return <svg {...p}><path d="M6 3h9l3 3v15H6z" /><path d="M14 3v4h4M9 12h6M9 16h4" /></svg>;
  if (name === 'task') return <svg {...p}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="m8 12 2.2 2.2L16 8.5M8 9h2" /></svg>;
  if (name === 'approval') return <svg {...p}><circle cx="12" cy="12" r="8" /><path d="m8.5 12 2.2 2.2 4.8-5" /></svg>;
  if (name === 'report') return <svg {...p}><path d="M5 20V10M12 20V4M19 20v-7" /></svg>;
  if (name === 'search') return <svg {...p}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>;
  if (name === 'plus') return <svg {...p}><path d="M12 5v14M5 12h14" /></svg>;
  if (name === 'alert') return <svg {...p}><path d="m12 3 9 17H3L12 3Z" /><path d="M12 9v5M12 17h.01" /></svg>;
  if (name === 'check') return <svg {...p}><path d="m5 12 4 4L19 6" /></svg>;
  if (name === 'activity') return <svg {...p}><path d="M4 12h4l2-6 4 12 2-6h4" /></svg>;
  return <svg {...p}><circle cx="12" cy="12" r="9" /></svg>;
}

function Brand() {
  return <span className="brand-mark"><svg viewBox="0 0 48 48" fill="none"><rect x="2" y="2" width="44" height="44" rx="13" fill="#4C6FFF"/><path d="M16 11h11l7 7v19H16V11Z" fill="white"/><path d="M27 11v8h8" fill="white" fillOpacity=".7"/><path d="m24 24 2.8 2.8L33 20.6" stroke="#4E6BFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></span>;
}

function decodeToken(token: string | null): { role: Role; name: string; email?: string } {
  try {
    if (!token) return { role: 'VIEWER', name: 'User' };
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return { role: payload.role ?? 'VIEWER', name: payload.name ?? payload.email ?? 'User', email: payload.email };
  } catch { return { role: 'VIEWER', name: 'User' }; }
}

function formatDate(value: string | null | undefined, lang: Lang) {
  if (!value) return lang === 'id' ? 'Tanpa masa berlaku' : 'No expiry';
  return new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function daysUntil(value?: string | null) {
  if (!value) return null;
  return Math.ceil((new Date(value).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((v) => v[0]).join('').toUpperCase() || 'US';
}

function statusLabel(status: string, t: (k: Key) => string) {
  if (status === 'PENDING') return t('statusPending');
  if (status === 'APPROVED') return t('statusApproved');
  if (status === 'REJECTED') return t('statusRejected');
  if (status === 'IN_PROGRESS') return t('statusInProgress');
  if (status === 'COMPLETED') return t('statusCompleted');
  return status.replaceAll('_', ' ');
}

export default function Home() {
  const [lang, setLang] = useState<Lang>('en');
  const [theme, setTheme] = useState<Theme>('dark');
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<Role>('VIEWER');
  const [userName, setUserName] = useState('User');
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('Admin123!');
  const [showPassword, setShowPassword] = useState(false);
  const [documents, setDocuments] = useState<DocumentSummary>(emptyDocuments);
  const [expiring, setExpiring] = useState<DocumentItem[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<DocumentItem[]>([]);
  const [office, setOffice] = useState<OfficeDashboard>(emptyOffice);
  const [officeEnabled, setOfficeEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const t = (key: Key) => copy[lang][key];

  useEffect(() => {
    const storedToken = sessionStorage.getItem('expiry-tracker-token');
    const storedLang = localStorage.getItem('expiry-tracker-language') as Lang | null;
    const storedTheme = localStorage.getItem('expiry-tracker-theme') as Theme | null;
    if (storedToken) { setToken(storedToken); const u = decodeToken(storedToken); setRole(u.role); setUserName(u.name); }
    if (storedLang === 'en' || storedLang === 'id') setLang(storedLang);
    if (storedTheme === 'dark' || storedTheme === 'light') setTheme(storedTheme);
  }, []);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      setLoading(true); setError('');
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [summaryRes, expiringRes, recentRes, officeRes] = await Promise.all([
          fetch(`${API_URL}/dashboard/summary`, { headers, cache: 'no-store' }),
          fetch(`${API_URL}/dashboard/expiring?limit=8`, { headers, cache: 'no-store' }),
          fetch(`${API_URL}/dashboard/recent?limit=8`, { headers, cache: 'no-store' }),
          fetch(`${API_URL}/office-automation/dashboard`, { headers, cache: 'no-store' }),
        ]);
        if ([summaryRes, expiringRes, recentRes].some((res) => res.status === 401)) {
          sessionStorage.removeItem('expiry-tracker-token'); setToken(null); return;
        }
        if (!summaryRes.ok || !expiringRes.ok || !recentRes.ok) throw new Error(lang === 'id' ? 'Gagal memuat ringkasan platform.' : 'Unable to load platform overview.');
        setDocuments(await summaryRes.json());
        setExpiring(await expiringRes.json());
        setRecentDocuments(await recentRes.json());
        if (officeRes.ok) { setOffice(await officeRes.json()); setOfficeEnabled(true); }
        else { setOffice(emptyOffice); setOfficeEnabled(false); }
      } catch (e) {
        setError(e instanceof Error ? e.message : (lang === 'id' ? 'Gagal memuat data.' : 'Unable to load data.'));
      } finally { setLoading(false); }
    };
    void load();
  }, [token, lang]);

  function changeLang(value: Lang) { setLang(value); localStorage.setItem('expiry-tracker-language', value); }
  function changeTheme(value: Theme) { setTheme(value); localStorage.setItem('expiry-tracker-theme', value); }

  async function login(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const response = await fetch(`${API_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? t('loginFailed'));
      sessionStorage.setItem('expiry-tracker-token', payload.accessToken);
      const user = decodeToken(payload.accessToken);
      setToken(payload.accessToken); setRole(payload.user?.role ?? user.role); setUserName(payload.user?.name ?? user.name);
      window.dispatchEvent(new Event('expiry-tracker-auth-change'));
    } catch (e) { setError(e instanceof Error ? e.message : t('loginFailed')); }
    finally { setLoading(false); }
  }

  function logout() {
    sessionStorage.removeItem('expiry-tracker-token'); setToken(null); setRole('VIEWER'); setUserName('User');
    setDocuments(emptyDocuments); setExpiring([]); setRecentDocuments([]); setOffice(emptyOffice); setOfficeEnabled(false);
    window.dispatchEvent(new Event('expiry-tracker-auth-change'));
  }

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return lang === 'id' ? 'Selamat pagi' : 'Good morning';
    if (hour < 18) return lang === 'id' ? 'Selamat siang' : 'Good afternoon';
    return lang === 'id' ? 'Selamat sore' : 'Good evening';
  }, [lang]);

  const attention = useMemo(() => [...expiring].sort((a, b) => (daysUntil(a.expiryDate) ?? 99999) - (daysUntil(b.expiryDate) ?? 99999)).slice(0, 5), [expiring]);
  const initialsText = initials(userName);
  const privileged = role === 'SUPERUSER' || role === 'EDITOR';
  const officePending = privileged ? office.pendingRequests : office.myRequests;
  const officeTasks = privileged ? office.openTasks : office.myTasks;

  if (!token) return <main className="login-shell">
    <section className="login-showcase"><div className="login-grid"/><div className="login-orb one"/><div className="login-orb two"/><div className="login-showcase-inner"><div className="login-brand"><Brand/><span>{t('product')}</span></div><p className="eyebrow">{t('secure')}</p><h1>One workspace for<br/><em>business operations.</em></h1><p className="lead">Manage contracts, document expiry, employee requests, tasks, approvals and integrations from one reliable operational command center.</p><div className="feature-list"><div><Icon name="doc"/><span><strong>Documents</strong><small>Track every important business document.</small></span></div><div><Icon name="office"/><span><strong>Office Automation</strong><small>Requests, tasks and approvals in one flow.</small></span></div><div><Icon name="activity"/><span><strong>Integrations</strong><small>Connect n8n and Telegram without losing control of your data.</small></span></div></div></div><div className="login-footer">© 2026 Business Operations Platform</div></section>
    <section className="login-panel"><div className="login-panel-top"><button onClick={() => changeLang(lang === 'en' ? 'id' : 'en')}>{lang.toUpperCase()}</button></div><div className="login-card"><p className="eyebrow">{t('secure')}</p><h2>{t('welcome')}</h2><p>{t('signInAccount')}</p><form onSubmit={login}><label>{t('email')}<div className="login-input"><Icon name="users" size={17}/><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"/></div></label><label>{t('password')}<div className="login-input"><Icon name="settings" size={17}/><input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="current-password"/><button type="button" onClick={() => setShowPassword((v) => !v)}>{showPassword ? 'Hide' : 'Show'}</button></div></label>{error && <div className="login-error"><Icon name="alert" size={15}/>{error}</div>}<button className="login-submit" disabled={loading}>{loading ? t('signingIn') : t('signIn')} <span>→</span></button></form><div className="login-security"><span>✓</span>{t('protected')}</div></div></section>
  </main>;

  const bg = theme === 'dark' ? '#080d15' : '#f6f8fb';
  const surface = theme === 'dark' ? '#101721' : '#ffffff';
  const surface2 = theme === 'dark' ? '#0d141d' : '#f9fafc';
  const text = theme === 'dark' ? '#f4f7fb' : '#172033';
  const muted = theme === 'dark' ? '#8997aa' : '#667085';
  const border = theme === 'dark' ? '#25303d' : '#e3e8ef';
  const sidebar = theme === 'dark' ? '#090f17' : '#071a34';
  const navSections = [
    { label: lang === 'id' ? 'UMUM' : 'GENERAL', items: [{ key: 'overview' as Key, href: '/', icon: 'home' }, { key: 'documents' as Key, href: '/documents', icon: 'doc' }, { key: 'reminders' as Key, href: '/reminders', icon: 'bell' }, { key: 'archived' as Key, href: '/documents?status=ARCHIVED', icon: 'archive' }] },
    ...(officeEnabled ? [{ label: 'OFFICE AUTOMATION', items: [{ key: 'officeDashboard' as Key, href: '/office', icon: 'office' }, { key: 'requests' as Key, href: '/office/requests', icon: 'request' }, { key: 'tasks' as Key, href: '/office/tasks', icon: 'task' }, { key: 'approvals' as Key, href: '/office/approvals', icon: 'approval' }, { key: 'reports' as Key, href: '/office/reports', icon: 'report' }] }] : []),
    ...(role === 'SUPERUSER' ? [{ label: t('administration'), items: [{ key: 'users' as Key, href: '/users', icon: 'users' }, { key: 'audit' as Key, href: '/audit', icon: 'audit' }, { key: 'settings' as Key, href: '/settings', icon: 'settings' }] }] : []),
  ];

  return <main className="app" style={{ background: bg, color: text, ['--surface' as string]: surface, ['--surface2' as string]: surface2, ['--border' as string]: border, ['--muted' as string]: muted }}>
    <aside className="sidebar" style={{ background: sidebar }}><div className="brand"><Brand/><div><strong>{t('product')}</strong><span>{t('command')}</span></div></div>{navSections.map((section) => <div className="nav-section" key={section.label}><div className="nav-label">{section.label}</div><nav>{section.items.map((item) => <Link href={item.href} key={item.href} className={`nav-item ${item.href === '/' ? 'active' : ''}`}><Icon name={item.icon}/><span>{t(item.key)}</span></Link>)}</nav></div>)}<div className="sidebar-account"><div className="avatar">{initialsText}</div><div><strong>{userName}</strong><span>{role}</span></div><button onClick={logout} title={t('logout')}>↗</button></div></aside>
    <section className="main"><header className="topbar"><div className="search"><Icon name="search" size={17}/><input placeholder={t('search')} onKeyDown={(e) => { if (e.key === 'Enter') window.location.href = `/documents?search=${encodeURIComponent(e.currentTarget.value)}`; }}/><kbd>/</kbd></div><div className="top-actions"><button onClick={() => changeTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? '☼' : '◐'}</button><button onClick={() => changeLang(lang === 'en' ? 'id' : 'en')}>{lang.toUpperCase()}</button><button className="bell"><Icon name="bell" size={18}/><b>{documents.expiringSoon + office.pendingApprovals}</b></button><div className="user"><div className="avatar">{initialsText}</div><div><strong>{userName}</strong><span>{role}</span></div><button onClick={logout}>⌄</button></div></div></header>
      <div className="content"><div className="heading"><div><p>{t('overview')}</p><h1>{greeting}, {userName.split(' ')[0]}.</h1><span>{t('dashboardCopy')}</span></div><div className="heading-actions">{officeEnabled && <Link href="/office/new" className="primary"><Icon name="plus" size={16}/>{t('newRequest')}</Link>}{privileged && <Link href="/documents/new" className="secondary"><Icon name="plus" size={16}/>{t('addDocument')}</Link>}</div></div>
        {error && <div className="error"><Icon name="alert" size={16}/>{error}</div>}

        <section className="kpis">
          <Link href="/documents" className="kpi"><span>{t('totalDocuments')}</span><strong>{documents.total}</strong><small>{t('activeDocuments')}</small><i className="blue"><Icon name="doc" size={20}/></i></Link>
          <Link href={officeEnabled ? '/office/requests' : '/documents'} className="kpi"><span>{t('pendingRequests')}</span><strong>{officePending}</strong><small>{privileged ? t('requests') : t('myRequests')}</small><i className="purple"><Icon name="request" size={20}/></i></Link>
          <Link href={officeEnabled ? '/office/tasks' : '/documents'} className="kpi"><span>{t('openTasks')}</span><strong>{officeTasks}</strong><small>{office.overdueTasks ? `${office.overdueTasks} ${t('overdueTasks').toLowerCase()}` : t('tasks')}</small><i className="green"><Icon name="task" size={20}/></i></Link>
          <Link href={officeEnabled ? '/office/approvals' : '/documents'} className="kpi"><span>{t('pendingApprovals')}</span><strong>{office.pendingApprovals}</strong><small>{t('approvals')}</small><i className="amber"><Icon name="approval" size={20}/></i></Link>
          <Link href="/documents?status=EXPIRING_SOON" className="kpi"><span>{t('expiringSoon')}</span><strong>{documents.expiringSoon}</strong><small>{t('within30')}</small><i className="orange"><Icon name="bell" size={20}/></i></Link>
          <div className="kpi"><span>{t('integrationHealth')}</span><strong className={office.integration.healthy ? 'healthy-text' : 'danger-text'}>{officeEnabled ? (office.integration.healthy ? t('healthy') : t('attention')) : '—'}</strong><small>{officeEnabled ? `${office.integration.failed} ${t('failedEvents').toLowerCase()}` : '—'}</small><i className={office.integration.healthy ? 'green' : 'red'}><Icon name={office.integration.healthy ? 'check' : 'alert'} size={20}/></i></div>
        </section>

        <section className="grid-main"><div className="left-column">
          <div className="panel operations"><div className="panel-head"><div><strong>{t('operationalWork')}</strong><span>{t('operationalSub')}</span></div>{officeEnabled && <Link href="/office">{t('viewAll')} →</Link>}</div><div className="ops-grid"><Link href="/office/requests" className="ops-card"><span className="ops-icon purple"><Icon name="request" size={18}/></span><div><strong>{officePending}</strong><span>{t('pendingRequests')}</span></div><em>{officePending > 0 ? 'Action' : 'Clear'}</em></Link><Link href="/office/approvals" className="ops-card"><span className="ops-icon amber"><Icon name="approval" size={18}/></span><div><strong>{office.pendingApprovals}</strong><span>{t('pendingApprovals')}</span></div><em>{office.pendingApprovals > 0 ? 'Action' : 'Clear'}</em></Link><Link href="/office/tasks" className="ops-card"><span className="ops-icon green"><Icon name="task" size={18}/></span><div><strong>{officeTasks}</strong><span>{t('openTasks')}</span></div><em>{office.overdueTasks > 0 ? `${office.overdueTasks} overdue` : 'On track'}</em></Link><div className="ops-card"><span className="ops-icon blue"><Icon name="activity" size={18}/></span><div><strong>{office.completionRate}%</strong><span>{t('completion')}</span></div><em>{office.totalRequests} {t('trackedRequests')}</em></div></div></div>

          <div className="panel activity"><div className="panel-head"><div><strong>{t('recentActivity')}</strong><span>{t('recentActivitySub')}</span></div>{officeEnabled && <Link href="/audit">{t('viewAll')} →</Link>}</div><div className="activity-list">{officeEnabled && office.recentActivity.length ? office.recentActivity.map((item) => <Link href={`/office/requests/${item.request.id}`} className="activity-row" key={item.id}><span className="activity-dot"><Icon name={item.action.includes('APPROV') ? 'approval' : item.action.includes('TASK') ? 'task' : 'activity'} size={15}/></span><div><strong>{item.action.replaceAll('_', ' ')}</strong><small>{item.request.requestNumber} · {item.request.title}</small></div><time>{formatDate(item.createdAt, lang)}</time><em className={`pill ${item.request.status.toLowerCase()}`}>{statusLabel(item.request.status, t)}</em></Link>) : <div className="empty">{officeEnabled ? (lang === 'id' ? 'Belum ada aktivitas Office Automation.' : 'No Office Automation activity yet.') : (lang === 'id' ? 'Modul Office Automation belum tersedia untuk akun ini.' : 'Office Automation is not enabled for this account.')}</div>}</div></div>

          <div className="panel documents-panel"><div className="panel-head"><div><strong>{t('documentsPanel')}</strong><span>{t('documentsPanelSub')}</span></div><Link href="/documents">{t('viewAll')} →</Link></div><div className="document-list">{attention.length ? attention.map((doc) => { const d = daysUntil(doc.expiryDate); return <Link href={`/documents/${doc.id}`} className="document-row" key={doc.id}><span className={`doc-icon ${doc.status.toLowerCase()}`}><Icon name={doc.status === 'EXPIRED' ? 'alert' : 'doc'} size={16}/></span><div><strong>{doc.title}</strong><small>{doc.documentType} · {doc.counterparty || '—'}</small></div><div className="doc-date"><em>{d === null ? t('noExpiry') : d < 0 ? `${Math.abs(d)} ${d === -1 ? t('day') : t('days')}` : `${d} ${d === 1 ? t('day') : t('days')}`}</em><span>{formatDate(doc.expiryDate, lang)}</span></div></Link>; }) : <div className="empty"><Icon name="check" size={22}/><strong>{t('noAttention')}</strong></div>}</div></div>
        </div><aside className="right-column">
          <div className="panel integration"><div className="panel-head"><div><strong>{t('integrationHealth')}</strong><span>{t('integrationSub')}</span></div><span className={`health ${office.integration.healthy ? 'ok' : 'bad'}`}><i/> {officeEnabled ? (office.integration.healthy ? t('healthy') : t('attention')) : '—'}</span></div>{officeEnabled ? <div className="integration-body"><div className="integration-brand"><div className="n8n-badge">n8n</div><div><strong>Integration event pipeline</strong><small>PostgreSQL → Scheduler → n8n → Telegram</small></div></div><div className="integration-stats"><div><strong>{office.integration.pending}</strong><span>{t('pendingEvents')}</span></div><div><strong>{office.integration.processing}</strong><span>Processing</span></div><div><strong className={office.integration.failed ? 'danger-text' : ''}>{office.integration.failed}</strong><span>{t('failedEvents')}</span></div><div><strong>{office.integration.delivered}</strong><span>{t('deliveredEvents')}</span></div></div></div> : <div className="empty">{lang === 'id' ? 'Aktifkan akses Office Automation untuk melihat integrasi.' : 'Enable Office Automation access to view integrations.'}</div>}</div>

          <div className="panel quick"><div className="panel-head"><div><strong>{t('quickActions')}</strong><span>{lang === 'id' ? 'Aksi yang sering digunakan' : 'Common actions'}</span></div></div><div className="quick-grid">{privileged && <Link href="/documents/new"><Icon name="doc" size={19}/><span>{t('addDocument')}</span></Link>}{officeEnabled && <Link href="/office/new"><Icon name="request" size={19}/><span>{t('newRequest')}</span></Link>}<Link href="/documents?status=EXPIRING_SOON"><Icon name="bell" size={19}/><span>{t('expiringSoon')}</span></Link>{officeEnabled && <Link href="/office/tasks"><Icon name="task" size={19}/><span>{t('viewTasks')}</span></Link>}{officeEnabled && <Link href="/office/approvals"><Icon name="approval" size={19}/><span>{t('viewApprovals')}</span></Link>}<Link href="/documents"><Icon name="search" size={19}/><span>{t('documents')}</span></Link></div></div>

          <div className="panel completion"><div className="panel-head"><div><strong>{t('completion')}</strong><span>{office.totalRequests} {t('trackedRequests')}</span></div></div><div className="completion-number"><strong>{office.completionRate}%</strong><span>{t('statusCompleted')}</span></div><div className="progress"><i style={{ width: `${Math.min(100, office.completionRate)}%` }}/></div><div className="completion-meta"><span>{office.completedRequests} completed</span><span>{Math.max(0, office.totalRequests - office.completedRequests)} remaining</span></div></div>

          <div className="panel recent-docs"><div className="panel-head"><div><strong>{t('documents')}</strong><span>{documents.total} {t('totalDocuments').toLowerCase()}</span></div><Link href="/documents">→</Link></div>{recentDocuments.slice(0, 4).map((doc) => <Link href={`/documents/${doc.id}`} className="mini-doc" key={doc.id}><span><Icon name="doc" size={14}/></span><div><strong>{doc.title}</strong><small>{formatDate(doc.expiryDate, lang)}</small></div></Link>)}</div>
        </aside></section>
      </div></section>
    <style jsx global>{`
      *{box-sizing:border-box}.app{min-height:100vh;display:grid;grid-template-columns:254px minmax(0,1fr);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.sidebar{position:sticky;top:0;height:100vh;padding:22px 15px;display:flex;flex-direction:column;color:#eaf0f8;border-right:1px solid rgba(255,255,255,.05)}.brand{display:flex;gap:11px;align-items:center;padding:3px 8px 26px}.brand>div{display:grid;line-height:1.2;min-width:0}.brand strong{font-size:12px;letter-spacing:-.015em;white-space:nowrap}.brand span{font-size:10px;color:#7f8da2;margin-top:4px}.brand-mark{width:34px;height:34px;display:inline-flex;flex:none}.brand-mark svg{width:100%;height:100%}.nav-section{margin-bottom:18px}.nav-label{padding:0 12px 8px;font-size:9px;font-weight:800;letter-spacing:.12em;color:#66758b}.nav-section nav{display:grid;gap:3px}.nav-item{height:40px;padding:0 12px;display:flex;align-items:center;gap:11px;border-radius:8px;color:#9ba9bc;font-size:11px;font-weight:650;text-decoration:none}.nav-item:hover{background:rgba(255,255,255,.055);color:#fff}.nav-item.active{background:#315bc7;color:#fff;box-shadow:0 7px 20px rgba(49,91,199,.2)}.nav-item svg{flex:none}.sidebar-account{margin-top:auto;padding:10px 9px;border:1px solid rgba(255,255,255,.08);border-radius:10px;display:flex;align-items:center;gap:9px;background:rgba(255,255,255,.035)}.sidebar-account>div:nth-child(2){display:grid;min-width:0;flex:1}.sidebar-account strong{font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sidebar-account span{font-size:8px;color:#74839a;margin-top:3px}.sidebar-account button{border:0;background:transparent;color:#8090a4;cursor:pointer}.avatar{width:31px;height:31px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(145deg,#4c6fff,#7b5cff);color:#fff;font-size:9px;font-weight:800;flex:none}.main{min-width:0}.topbar{height:76px;padding:0 clamp(18px,3vw,40px);display:flex;align-items:center;justify-content:space-between;gap:20px;border-bottom:1px solid var(--border);background:var(--surface);position:sticky;top:0;z-index:5}.search{width:min(560px,52vw);height:40px;display:flex;align-items:center;gap:10px;border:1px solid var(--border);border-radius:9px;padding:0 11px;color:var(--muted);background:var(--surface2)}.search input{flex:1;min-width:0;border:0;outline:0;background:transparent;color:inherit;font-size:11px}.search kbd{font-size:9px;border:1px solid var(--border);border-radius:5px;padding:3px 6px}.top-actions{display:flex;align-items:center;gap:7px}.top-actions>button{height:36px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--muted);font-size:10px;font-weight:800;padding:0 10px;cursor:pointer}.top-actions .bell{width:36px;padding:0;position:relative}.bell b{position:absolute;right:-4px;top:-5px;min-width:15px;height:15px;display:grid;place-items:center;border-radius:999px;background:#ef4444;color:#fff;font-size:8px}.user{height:40px;padding-left:9px;margin-left:3px;border-left:1px solid var(--border);display:flex;align-items:center;gap:8px}.user>div:nth-child(2){display:grid}.user strong{font-size:10px}.user span{font-size:8px;color:var(--muted);margin-top:2px}.user>button{border:0;background:transparent;color:var(--muted);cursor:pointer}.content{width:min(100%,1550px);margin:0 auto;padding:28px clamp(18px,3vw,44px) 50px}.heading{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:22px}.heading p{margin:0 0 5px;color:#6d7b91;font-size:10px;font-weight:750}.heading h1{margin:0;font-size:29px;letter-spacing:-.045em}.heading>div>span{display:block;margin-top:6px;color:var(--muted);font-size:11px}.heading-actions{display:flex;gap:8px}.primary,.secondary{height:39px;padding:0 13px;border-radius:8px;display:flex;align-items:center;gap:7px;font-size:10px;font-weight:800;text-decoration:none}.primary{background:#315bc7;color:#fff;box-shadow:0 8px 20px rgba(49,91,199,.2)}.secondary{border:1px solid var(--border);background:var(--surface);color:var(--text)}.error{margin-bottom:14px;border:1px solid #7d3238;background:rgba(150,35,45,.12);color:#ffb4ba;border-radius:9px;padding:10px 12px;font-size:10px;display:flex;gap:8px;align-items:center}.kpis{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin-bottom:16px}.kpi{position:relative;min-height:116px;padding:16px;border:1px solid var(--border);border-radius:12px;background:var(--surface);text-decoration:none;color:var(--text);overflow:hidden}.kpi:hover{transform:translateY(-1px);border-color:#3b5f9c}.kpi>span{display:block;color:var(--muted);font-size:9px;font-weight:700;max-width:72%}.kpi>strong{display:block;margin-top:9px;font-size:25px;letter-spacing:-.045em}.kpi>small{display:block;margin-top:4px;color:var(--muted);font-size:8px;max-width:72%}.kpi>i{position:absolute;right:13px;top:14px;width:37px;height:37px;border-radius:10px;display:grid;place-items:center;font-style:normal}.kpi>i.blue,.ops-icon.blue{background:rgba(76,111,255,.13);color:#83a0ff}.kpi>i.purple,.ops-icon.purple{background:rgba(123,92,255,.13);color:#a58eff}.kpi>i.green,.ops-icon.green{background:rgba(39,183,122,.13);color:#52d39b}.kpi>i.amber,.ops-icon.amber{background:rgba(245,159,32,.14);color:#ffbc55}.kpi>i.orange{background:rgba(236,137,18,.14);color:#ffad35}.kpi>i.red{background:rgba(239,68,68,.14);color:#ff7a80}.healthy-text{color:#36c98c!important;font-size:18px!important}.danger-text{color:#ff6971!important}.grid-main{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(310px,.7fr);gap:15px}.left-column,.right-column{display:grid;gap:15px;align-content:start;min-width:0}.panel{border:1px solid var(--border);border-radius:12px;background:var(--surface);overflow:hidden}.panel-head{min-height:59px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid var(--border)}.panel-head>div{display:grid;min-width:0}.panel-head strong{font-size:12px;letter-spacing:-.015em}.panel-head span{font-size:8px;color:var(--muted);margin-top:4px}.panel-head>a{color:#7895ff;font-size:9px;font-weight:800;text-decoration:none;white-space:nowrap}.ops-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:12px}.ops-card{min-height:100px;padding:13px;border:1px solid var(--border);border-radius:9px;text-decoration:none;color:var(--text);display:grid;grid-template-columns:34px 1fr;column-gap:9px;align-items:center;position:relative;background:var(--surface2)}.ops-card:hover{border-color:#3a5b8f}.ops-icon{width:34px;height:34px;border-radius:9px;display:grid;place-items:center}.ops-card>div{display:grid}.ops-card strong{font-size:20px;letter-spacing:-.04em}.ops-card span{font-size:8px;color:var(--muted);margin-top:2px}.ops-card em{grid-column:1/-1;margin-top:9px;font-size:8px;font-style:normal;color:var(--muted)}.activity-list{display:grid}.activity-row{min-height:58px;padding:9px 14px;display:grid;grid-template-columns:29px minmax(0,1fr) auto auto;align-items:center;gap:9px;border-bottom:1px solid var(--border);text-decoration:none;color:var(--text)}.activity-row:last-child{border-bottom:0}.activity-row:hover{background:var(--surface2)}.activity-dot{width:29px;height:29px;border-radius:8px;display:grid;place-items:center;background:rgba(76,111,255,.12);color:#89a0ff}.activity-row>div{display:grid;min-width:0}.activity-row strong{font-size:9px}.activity-row small{font-size:8px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:3px}.activity-row time{font-size:8px;color:var(--muted)}.pill{font-style:normal;font-size:7px;font-weight:800;padding:4px 6px;border-radius:999px;background:rgba(255,255,255,.06);color:var(--muted);white-space:nowrap}.pill.pending{background:rgba(245,159,32,.13);color:#ffbd57}.pill.approved,.pill.completed{background:rgba(39,183,122,.13);color:#57d59f}.pill.rejected{background:rgba(239,68,68,.13);color:#ff7a80}.pill.in_progress{background:rgba(76,111,255,.13);color:#8ea6ff}.empty{min-height:110px;padding:24px;display:grid;place-content:center;justify-items:center;text-align:center;color:var(--muted);font-size:9px;gap:7px}.empty strong{color:var(--text);font-size:10px}.document-list{display:grid}.document-row{min-height:63px;padding:10px 14px;display:grid;grid-template-columns:32px minmax(0,1fr) auto;align-items:center;gap:9px;border-bottom:1px solid var(--border);text-decoration:none;color:var(--text)}.document-row:last-child{border-bottom:0}.document-row:hover{background:var(--surface2)}.doc-icon{width:32px;height:32px;border-radius:9px;display:grid;place-items:center;background:rgba(76,111,255,.12);color:#86a0ff}.doc-icon.expiring_soon{background:rgba(245,159,32,.13);color:#ffb946}.doc-icon.expired{background:rgba(239,68,68,.13);color:#ff7279}.document-row>div:nth-child(2){min-width:0;display:grid}.document-row strong{font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.document-row small{font-size:8px;color:var(--muted);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.doc-date{display:grid;justify-items:end}.doc-date em{font-style:normal;font-size:8px;font-weight:800;color:#ffb43f}.doc-date span{font-size:8px;color:var(--muted);margin-top:3px}.health{font-size:8px;font-weight:800;display:flex;align-items:center;gap:5px}.health i{width:7px;height:7px;border-radius:50%;display:block}.health.ok{color:#4fd39a}.health.ok i{background:#31c88c;box-shadow:0 0 0 4px rgba(49,200,140,.08)}.health.bad{color:#ff737a}.health.bad i{background:#ef4444}.integration-body{padding:15px}.integration-brand{display:flex;align-items:center;gap:10px;padding-bottom:13px;border-bottom:1px solid var(--border)}.n8n-badge{width:42px;height:34px;border-radius:8px;display:grid;place-items:center;background:#202938;color:#fff;font-weight:900;font-size:11px}.integration-brand>div:last-child{display:grid}.integration-brand strong{font-size:9px}.integration-brand small{font-size:8px;color:var(--muted);margin-top:3px}.integration-stats{display:grid;grid-template-columns:1fr 1fr;gap:1px;margin-top:13px;background:var(--border);border:1px solid var(--border);border-radius:8px;overflow:hidden}.integration-stats>div{background:var(--surface2);padding:11px}.integration-stats strong{display:block;font-size:16px}.integration-stats span{display:block;font-size:7px;color:var(--muted);margin-top:3px}.quick-grid{padding:12px;display:grid;grid-template-columns:1fr 1fr;gap:7px}.quick-grid a{min-height:62px;border:1px solid var(--border);border-radius:8px;display:grid;place-content:center;justify-items:center;gap:6px;text-decoration:none;color:#89a2ff;background:var(--surface2)}.quick-grid a:hover{border-color:#4a6695}.quick-grid span{font-size:8px;font-weight:750;color:var(--text)}.completion-number{padding:16px 16px 7px;display:flex;align-items:end;gap:7px}.completion-number strong{font-size:31px;letter-spacing:-.05em}.completion-number span{font-size:8px;color:var(--muted);padding-bottom:5px}.progress{height:7px;margin:3px 16px 9px;border-radius:99px;background:#222d3a;overflow:hidden}.progress i{display:block;height:100%;border-radius:99px;background:#36c98c}.completion-meta{display:flex;justify-content:space-between;padding:0 16px 14px;color:var(--muted);font-size:7px}.mini-doc{min-height:52px;padding:8px 13px;display:flex;align-items:center;gap:9px;border-bottom:1px solid var(--border);text-decoration:none;color:var(--text)}.mini-doc:last-child{border-bottom:0}.mini-doc>span{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;background:rgba(76,111,255,.11);color:#8ca2ff}.mini-doc>div{display:grid;min-width:0}.mini-doc strong{font-size:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mini-doc small{font-size:7px;color:var(--muted);margin-top:3px}@media(max-width:1250px){.kpis{grid-template-columns:repeat(3,1fr)}.grid-main{grid-template-columns:1fr}.right-column{grid-template-columns:repeat(3,1fr)}.right-column>.recent-docs{grid-column:1/-1}}@media(max-width:900px){.app{grid-template-columns:210px minmax(0,1fr)}.ops-grid{grid-template-columns:1fr 1fr}.right-column{grid-template-columns:1fr 1fr}}@media(max-width:700px){.app{display:block}.sidebar{position:relative;height:auto;padding:11px}.brand{padding-bottom:11px}.nav-section{display:none}.sidebar-account{display:none}.sidebar:after{content:'Overview   Documents   Office Automation';display:block;border-top:1px solid rgba(255,255,255,.07);padding:10px 8px 3px;color:#8594aa;font-size:9px}.topbar{height:62px;padding:0 12px}.search{width:42px;border:0;background:transparent;padding:0}.search input,.search kbd{display:none}.top-actions{margin-left:auto}.top-actions>button{padding:0 8px}.user>div:nth-child(2),.user>button{display:none}.content{padding:18px 12px 35px}.heading{align-items:start}.heading h1{font-size:23px}.heading>div>span{line-height:1.5}.heading-actions{flex-direction:column}.primary,.secondary{height:36px;font-size:9px}.kpis{grid-template-columns:1fr 1fr;gap:8px}.kpi{min-height:104px;padding:13px}.kpi>strong{font-size:22px}.kpi>i{width:32px;height:32px;right:10px;top:10px}.ops-grid{grid-template-columns:1fr 1fr}.activity-row{grid-template-columns:28px minmax(0,1fr);}.activity-row time,.activity-row .pill{display:none}.right-column{grid-template-columns:1fr}.right-column>.recent-docs{grid-column:auto}.document-row{grid-template-columns:30px minmax(0,1fr);}.doc-date{display:none}.login-showcase{display:none!important}.login-shell{display:block!important}.login-panel{min-height:100vh!important}.login-card{width:min(100% - 28px,420px)!important}}
    `}</style>
  </main>;
}
