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

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('Admin123!');
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

        if (!summaryResponse.ok || !expiringResponse.ok || !recentResponse.ok) {
          throw new Error('Unable to load dashboard data');
        }

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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
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
    setToken(null);
    setSummary(emptySummary);
    setExpiring([]);
    setRecent([]);
  }

  if (!token) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <div className="brand-mark">ET</div>
          <p className="eyebrow">Contract & Document Expiry Tracker</p>
          <h1>Stay ahead of every expiry.</h1>
          <p className="auth-copy">A focused command center for contracts, licenses, certificates, permits, and critical business documents.</p>
          <form onSubmit={login} className="login-form">
            <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" /></label>
            <label>Password<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" /></label>
            {loginError && <div className="error-banner">{loginError}</div>}
            <button className="primary-button" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
          </form>
          <p className="auth-footnote">Protected with JWT authentication and server-side role enforcement.</p>
        </section>
      </main>
    );
  }

  const metrics = [
    ['Total documents', summary.total, 'total'],
    ['Active', summary.active, 'active'],
    ['Expiring soon', summary.expiringSoon, 'warning'],
    ['Expired', summary.expired, 'danger'],
  ];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark small">ET</span><span>Expiry Tracker</span></div>
        <nav>
          <a className="nav-item active" href="#dashboard">Overview</a>
          <a className="nav-item" href="#documents">Documents</a>
          <a className="nav-item" href="#reminders">Reminders</a>
          <a className="nav-item" href="#audit">Audit log</a>
        </nav>
        <div className="sidebar-bottom">
          <span className="role-chip">Command center</span>
          <button className="nav-item logout" onClick={logout}>Sign out</button>
        </div>
      </aside>

      <div className="content">
        <header className="topbar">
          <div><p className="eyebrow">Overview</p><h1>{greeting}.</h1><p>Keep every important document ahead of its expiry date.</p></div>
          <button className="primary-button compact">+ Add document</button>
        </header>

        {dataError && <div className="error-banner page-error">{dataError}</div>}

        <section className="metrics-grid" id="dashboard">
          {metrics.map(([label, value, tone]) => <article className={`metric-card ${tone}`} key={label}><span>{label}</span><strong>{value}</strong></article>)}
        </section>

        <section className="dashboard-grid">
          <article className="panel attention" id="reminders">
            <div className="panel-heading"><div><p className="eyebrow">Priority</p><h2>Needs attention</h2></div><span className="count-badge">{expiring.length}</span></div>
            {loading ? <div className="empty-state">Refreshing your document health…</div> : expiring.length === 0 ? <div className="empty-state"><strong>All clear.</strong><span>No expired or soon-to-expire documents found.</span></div> : <div className="document-list">{expiring.map((document) => <DocumentRow key={document.id} document={document} />)}</div>}
          </article>

          <article className="panel" id="documents">
            <div className="panel-heading"><div><p className="eyebrow">Activity</p><h2>Recently added</h2></div><a href="#documents">View all</a></div>
            {recent.length === 0 ? <div className="empty-state"><strong>No documents yet.</strong><span>Add your first document to start tracking expiry dates.</span></div> : <div className="document-list">{recent.map((document) => <DocumentRow key={document.id} document={document} />)}</div>}
          </article>
        </section>

        <section className="insight-strip">
          <div><span className="insight-icon">✓</span><div><strong>{summary.active} active documents</strong><span>are currently outside the 30-day warning window.</span></div></div>
          <div><span className="insight-icon">!</span><div><strong>{summary.expiringSoon + summary.expired} require attention</strong><span>based on the current expiry status.</span></div></div>
          <div><span className="insight-icon">∞</span><div><strong>{summary.noExpiry} without expiry</strong><span>can still be tracked without reminders.</span></div></div>
        </section>
      </div>
    </main>
  );
}

function DocumentRow({ document }: { document: DocumentItem }) {
  return (
    <div className="document-row">
      <div className="document-icon">{document.documentType.slice(0, 2).toUpperCase()}</div>
      <div className="document-main"><strong>{document.title}</strong><span>{document.counterparty || document.documentNumber || document.documentType}</span></div>
      <div className="document-meta"><span className={`status ${document.status.toLowerCase()}`}>{statusLabel(document.status)}</span><span>{formatDate(document.expiryDate)}</span></div>
    </div>
  );
}
