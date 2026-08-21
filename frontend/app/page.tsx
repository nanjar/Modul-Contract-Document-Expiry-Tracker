'use client';

import { FormEvent, useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
type Summary = { total: number; active: number; expiringSoon: number; expired: number; noExpiry: number };
type DocumentItem = { id: string; title: string; documentType: string; expiryDate: string | null; status: string };

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  useEffect(() => { setToken(localStorage.getItem('expiry_token')); }, []);
  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetch(`${API}/dashboard/summary`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch(`${API}/documents`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ]).then(([s, d]) => { setSummary(s); setDocuments(Array.isArray(d) ? d : []); });
  }, [token]);

  async function login(event: FormEvent) {
    event.preventDefault(); setError('');
    const response = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    if (!response.ok) { setError('Unable to sign in. Check your credentials.'); return; }
    const data = await response.json(); localStorage.setItem('expiry_token', data.accessToken); setToken(data.accessToken);
  }

  if (!token) return (
    <main className="auth-shell"><section className="auth-card"><div className="eyebrow">EXPIRY TRACKER</div><h1>Stay ahead of every expiry.</h1><p>One calm place for contracts, licenses, certificates and other important documents.</p><form onSubmit={login}><label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label><label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} /></label>{error && <div className="error">{error}</div>}<button className="primary">Sign in</button></form></section></main>
  );

  const cards = [['Total Documents', summary?.total ?? 0], ['Active', summary?.active ?? 0], ['Expiring Soon', summary?.expiringSoon ?? 0], ['Expired', summary?.expired ?? 0]];
  return <main className="shell"><header className="topbar"><div><div className="eyebrow">EXPIRY TRACKER</div><h1>Good evening.</h1><p>Keep every important document ahead of its expiry date.</p></div><button className="secondary" onClick={() => { localStorage.removeItem('expiry_token'); setToken(null); }}>Sign out</button></header><section className="metrics">{cards.map(([label, value]) => <article key={String(label)}><span>{label}</span><strong>{value}</strong></article>)}</section><section className="panel"><div className="panel-head"><div><h2>Documents requiring attention</h2><p>Prioritized by expiry date.</p></div></div>{documents.length === 0 ? <div className="empty"><strong>No documents yet.</strong><span>Add your first document to start tracking expiry dates.</span></div> : <div className="table">{documents.slice(0, 10).map((doc) => <div className="row" key={doc.id}><div><strong>{doc.title}</strong><span>{doc.documentType}</span></div><div className={`status ${doc.status.toLowerCase()}`}>{doc.status.replace('_', ' ')}</div><div>{doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : 'No expiry'}</div></div>)}</div>}</section></main>;
}
