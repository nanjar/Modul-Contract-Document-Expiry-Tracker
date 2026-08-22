'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type Summary = {
  total: number;
  active: number;
  expiringSoon: number;
  expired: number;
  noExpiry: number;
};

type DocumentItem = {
  id: string;
  title: string;
  documentNumber?: string | null;
  documentType: string;
  counterparty?: string | null;
  expiryDate?: string | null;
  status: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'NO_EXPIRY' | 'ARCHIVED';
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
const emptySummary: Summary = { total: 0, active: 0, expiringSoon: 0, expired: 0, noExpiry: 0 };

function formatDate(value?: string | null) {
  if (!value) return 'No expiry';
  return new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function statusLabel(status: DocumentItem['status']) {
  return status.replaceAll('_', ' ');
}

function BrandIcon({ small = false }: { small?: boolean }) {
  return (
    <span className={`brand-icon${small ? ' small' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 48 48" fill="none">
        <rect x="2" y="2" width="44" height="44" rx="13" fill="url(#brand-gradient)" />
        <path d="M16 11h11l7 7v19H16V11Z" fill="white" fillOpacity=".98" />
        <path d="M27 11v8h8" fill="white" fillOpacity=".7" />
        <path d="m24 24 2.8 2.8L33 20.6" stroke="#4E6BFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 32h13" stroke="#D8DEFF" strokeWidth="2.5" strokeLinecap="round" />
        <defs><linearGradient id="brand-gradient" x1="6" y1="4" x2="42" y2="44"><stop stopColor="#4C6FFF"/><stop offset="1" stopColor="#8B4DFF"/></linearGradient></defs>
      </svg>
    </span>
  );
}

function FieldIcon({ type }: { type: 'email' | 'password' }) {
  return type === 'email' ? (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8"/><path d="M5 20c.7-3.4 3-5 7-5s6.3 1.6 7 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="15" r="1.2" fill="currentColor"/></svg>
  );
}

function FeatureIcon({ kind }: { kind: 'calendar' | 'bell' | 'shield' | 'chart' }) {
  const paths = {
    calendar: <><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/></>,
    bell: <><path d="M18 10a6 6 0 0 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8Z"/><path d="M10 21h4"/></>,
    shield: <><path d="M12 3 19 6v5c0 5-3.2 8.4-7 10-3.8-1.6-7-5-7-10V6l7-3Z"/><path d="m9 12 2 2 4-4"/></>,
    chart: <><path d="M5 19V11M12 19V6M19 19V3"/><path d="M3 19h18"/></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind]}</svg>;
}

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('Admin123!');
  const [showPassword, setShowPassword] = useState(false);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [expiring, setExpiring] = useState<DocumentItem[]>([]);
  const [recent, setRecent] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [dataError, setDataError] = useState('');

  useEffect(() => {
    const stored = window.sessionStorage.getItem('expiry-tracker-token');
    if (stored) setToken(stored);
  }, []);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      setLoading(true);
      setDataError('');
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [summaryResponse, expiringResponse, recentResponse] = await Promise.all([
          fetch(`${API_URL}/dashboard/summary`, { headers }),
          fetch(`${API_URL}/dashboard/expiring?limit=6`, { headers }),
          fetch(`${API_URL}/dashboard/recent?limit=6`, { headers }),
        ]);
        if ([summaryResponse, expiringResponse, recentResponse].some((response) => response.status === 401)) {
          window.sessionStorage.removeItem('expiry-tracker-token');
          setToken(null);
          return;
        }
        if (!summaryResponse.ok || !expiringResponse.ok || !recentResponse.ok) throw new Error('Unable to load dashboard data');
        setSummary(await summaryResponse.json());
        setExpiring(await expiringResponse.json());
        setRecent(await recentResponse.json());
      } catch (error) {
        setDataError(error instanceof Error ? error.message : 'Unable to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  async function login(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setLoginError('');
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? 'Login failed');
      window.sessionStorage.setItem('expiry-tracker-token', payload.accessToken);
      setToken(payload.accessToken);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    window.sessionStorage.removeItem('expiry-tracker-token');
    setToken(null); setSummary(emptySummary); setExpiring([]); setRecent([]);
  }

  if (!token) {
    return (
      <main className="auth-shell">
        <section className="auth-visual">
          <div className="visual-glow" />
          <div className="visual-content">
            <BrandIcon />
            <p className="eyebrow">Contract & Document Expiry Tracker</p>
            <h1>Stay ahead of<br />every expiry.</h1>
            <p className="auth-copy">A focused command center for contracts, licenses, certificates, permits, and critical business documents.</p>
            <div className="feature-grid">
              <Feature kind="calendar" title="Track Expiry" text="Never miss a deadline" />
              <Feature kind="bell" title="Smart Alerts" text="Get notified on time" />
              <Feature kind="shield" title="Secure & Role-based" text="Protected with JWT & RBAC" />
              <Feature kind="chart" title="Business Insights" text="Make informed decisions" />
            </div>
          </div>
          <p className="copyright">© 2026 Contract & Document Expiry Tracker. All rights reserved.</p>
        </section>

        <section className="auth-panel">
          <div className="auth-form-card">
            <div className="mobile-brand"><BrandIcon small /></div>
            <p className="eyebrow">Secure workspace</p>
            <h2>Welcome back</h2>
            <p className="form-subtitle">Sign in to your account</p>
            <form onSubmit={login} className="login-form">
              <label>Email
                <span className="input-wrap"><FieldIcon type="email" /><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" /></span>
              </label>
              <label>Password
                <span className="input-wrap"><FieldIcon type="password" /><input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? 'text' : 'password'} autoComplete="current-password" /><button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}><svg viewBox="0 0 24 24" fill="none"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg></button></span>
              </label>
              {loginError && <div className="error-banner"><span>!</span>{loginError}</div>}
              <button className="primary-button auth-submit" disabled={loading}><span>{loading ? 'Signing in…' : 'Sign in'}</span><svg viewBox="0 0 24 24" fill="none"><path d="M10 17l5-5-5-5M15 12H3M20 5v14"/></svg></button>
            </form>
            <div className="or-divider"><span>OR</span></div>
            <button className="google-button" type="button" disabled><span className="google-g">G</span>Sign in with Google</button>
            <div className="security-note"><span><FeatureIcon kind="shield" /></span><p>Protected with JWT authentication<br />and server-side role enforcement.</p></div>
          </div>
        </section>
      </main>
    );
  }

  const metrics = [
    ['Total documents', summary.total, 'total'], ['Active', summary.active, 'active'], ['Expiring soon', summary.expiringSoon, 'warning'], ['Expired', summary.expired, 'danger'],
  ];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><BrandIcon small /><span>Expiry Tracker</span></div>
        <nav><a className="nav-item active" href="#dashboard">Overview</a><a className="nav-item" href="#documents">Documents</a><a className="nav-item" href="#reminders">Reminders</a><a className="nav-item" href="#audit">Audit log</a></nav>
        <div className="sidebar-bottom"><span className="role-chip">Command center</span><button className="nav-item logout" onClick={logout}>Sign out</button></div>
      </aside>
      <div className="content">
        <header className="topbar"><div><p className="eyebrow">Overview</p><h1>{greeting}.</h1><p>Keep every important document ahead of its expiry date.</p></div><button className="primary-button compact">+ Add document</button></header>
        {dataError && <div className="error-banner page-error">{dataError}</div>}
        <section className="metrics-grid" id="dashboard">{metrics.map(([label, value, tone]) => <article className={`metric-card ${tone}`} key={label}><span>{label}</span><strong>{value}</strong></article>)}</section>
        <section className="dashboard-grid">
          <article className="panel attention" id="reminders"><div className="panel-heading"><div><p className="eyebrow">Priority</p><h2>Needs attention</h2></div><span className="count-badge">{expiring.length}</span></div>{loading ? <div className="empty-state">Refreshing your document health…</div> : expiring.length === 0 ? <div className="empty-state"><strong>All clear.</strong><span>No expired or soon-to-expire documents found.</span></div> : <div className="document-list">{expiring.map((document) => <DocumentRow key={document.id} document={document} />)}</div>}</article>
          <article className="panel" id="documents"><div className="panel-heading"><div><p className="eyebrow">Activity</p><h2>Recently added</h2></div><a href="#documents">View all</a></div>{recent.length === 0 ? <div className="empty-state"><strong>No documents yet.</strong><span>Add your first document to start tracking expiry dates.</span></div> : <div className="document-list">{recent.map((document) => <DocumentRow key={document.id} document={document} />)}</div>}</article>
        </section>
        <section className="insight-strip"><div><span className="insight-icon">✓</span><div><strong>{summary.active} active documents</strong><span>are currently outside the 30-day warning window.</span></div></div><div><span className="insight-icon">!</span><div><strong>{summary.expiringSoon + summary.expired} require attention</strong><span>based on the current expiry status.</span></div></div><div><span className="insight-icon">∞</span><div><strong>{summary.noExpiry} without expiry</strong><span>can still be tracked without reminders.</span></div></div></section>
      </div>
    </main>
  );
}

function Feature({ kind, title, text }: { kind: 'calendar' | 'bell' | 'shield' | 'chart'; title: string; text: string }) {
  return <div className="feature"><span className={`feature-icon ${kind}`}><FeatureIcon kind={kind} /></span><strong>{title}</strong><span>{text}</span></div>;
}

function DocumentRow({ document }: { document: DocumentItem }) {
  return <div className="document-row"><div className="document-icon">{document.documentType.slice(0, 2).toUpperCase()}</div><div className="document-main"><strong>{document.title}</strong><span>{document.counterparty || document.documentNumber || document.documentType}</span></div><div className="document-meta"><span className={`status ${document.status.toLowerCase()}`}>{statusLabel(document.status)}</span><span>{formatDate(document.expiryDate)}</span></div></div>;
}
