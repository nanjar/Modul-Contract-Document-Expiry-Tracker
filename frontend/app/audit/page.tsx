'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Role = 'SUPERUSER' | 'EDITOR' | 'VIEWER';
type AuditLog = {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  actorUserId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  actor?: { id?: string; name?: string; email?: string; role?: Role } | null;
};

type AuditResponse = {
  items: AuditLog[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
};

type Session = { token: string; role: Role };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const token = sessionStorage.getItem('expiry-tracker-token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return { token, role: payload.role as Role };
  } catch {
    return null;
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));
}

export default function AuditPage() {
  const [session, setSession] = useState<Session | null>(() => getSession());
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<AuditLog | null>(null);

  useEffect(() => {
    const syncSession = () => setSession(getSession());
    window.addEventListener('storage', syncSession);
    window.addEventListener('expiry-tracker-auth-change', syncSession);
    return () => {
      window.removeEventListener('storage', syncSession);
      window.removeEventListener('expiry-tracker-auth-change', syncSession);
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setLoading(false);
      setError('Sesi Anda tidak tersedia atau sudah berakhir. Silakan masuk kembali.');
      return;
    }

    if (session.role !== 'SUPERUSER') {
      setLoading(false);
      setError('Akses superuser diperlukan.');
      return;
    }

    const currentSession = session;
    const controller = new AbortController();
    let timedOut = false;
    let active = true;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 10000);

    async function load() {
      if (active) {
        setLoading(true);
        setError('');
      }
      try {
        const qs = new URLSearchParams({ page: String(page), limit: '20' });
        if (action.trim()) qs.set('action', action.trim());
        if (entity.trim()) qs.set('entity', entity.trim());

        const response = await fetch(`${API_URL}/audit-logs?${qs.toString()}`, {
          headers: { Authorization: `Bearer ${currentSession.token}` },
          signal: controller.signal,
          cache: 'no-store',
        });

        if (!response.ok) {
          if (response.status === 401) throw new Error('Sesi Anda telah berakhir. Silakan masuk kembali.');
          if (response.status === 403) throw new Error('Akses superuser diperlukan.');
          throw new Error(`Gagal memuat log audit (HTTP ${response.status}).`);
        }

        const data = (await response.json()) as AuditResponse | AuditLog[];
        if (!active) return;
        if (Array.isArray(data)) {
          setLogs(data);
          setTotal(data.length);
          setTotalPages(data.length >= 20 ? page + 1 : page);
        } else {
          setLogs(data.items ?? []);
          setTotal(data.pagination?.total ?? data.items?.length ?? 0);
          setTotalPages(data.pagination?.totalPages ?? 1);
        }
      } catch (err) {
        if (!active) return;
        if (err instanceof DOMException && err.name === 'AbortError') {
          if (timedOut) setError('Permintaan log audit terlalu lama. Periksa backend dan database.');
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Gagal memuat log audit.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [session, page, action, entity]);

  if (!session) return <main className="workspace"><div className="workspace-head"><p className="eyebrow">KEAMANAN</p><h1>Log audit</h1><p>Sesi Anda tidak tersedia atau sudah berakhir.</p><Link href="/" className="primary-button compact">Kembali ke login</Link></div></main>;

  return <main className="workspace">
    <div className="workspace-head" style={{ marginBottom: 26 }}><div><p className="eyebrow">KEAMANAN</p><h1>Log audit</h1><p>Tinjau aktivitas administratif dan dokumen yang dicatat oleh sistem.</p></div></div>
    <div className="toolbar" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
      <input value={action} onChange={(event) => { setPage(1); setAction(event.target.value); }} placeholder="Filter aksi…" className="search" style={{ flex: '1 1 260px', minWidth: 220 }} />
      <input value={entity} onChange={(event) => { setPage(1); setEntity(event.target.value); }} placeholder="Filter entitas…" className="search" style={{ flex: '1 1 220px', minWidth: 180 }} />
    </div>
    {error && <div className="inline-error" style={{ marginBottom: 16 }}>{error}</div>}
    <div className="table-card">
      <div className="table-meta"><strong>{total} event audit</strong><span>{loading ? 'Memuat…' : `Halaman ${page} dari ${totalPages}`}</span></div>
      {loading ? <div className="empty-state"><strong>Memuat aktivitas audit…</strong><p>Mengambil aktivitas keamanan terbaru.</p></div> : logs.length === 0 ? <div className="empty-state"><strong>Tidak ada event audit</strong><p>Tidak ada event yang cocok dengan filter saat ini.</p></div> : <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr>{['Waktu', 'Aksi', 'Entitas', 'Pelaku', ''].map((heading, index) => <th key={`${heading}-${index}`} style={{ textAlign: 'left', padding: '15px 20px' }}>{heading}</th>)}</tr></thead><tbody>{logs.map((log) => <tr key={log.id}><td style={{ padding: '16px 20px', fontSize: 12 }}>{formatDate(log.createdAt)}</td><td style={{ padding: '16px 20px', fontWeight: 800 }}>{log.action}</td><td style={{ padding: '16px 20px' }}><div style={{ fontWeight: 700 }}>{log.entity}</div><div style={{ fontSize: 11, color: 'var(--chrome-muted)', marginTop: 4 }}>{log.entityId ?? '—'}</div></td><td style={{ padding: '16px 20px', fontSize: 12 }}>{log.actor?.name ?? log.actor?.email ?? log.actorUserId ?? 'System'}</td><td style={{ padding: '16px 20px' }}><button onClick={() => setSelected(log)} style={{ border: 0, background: 'transparent', color: 'var(--chrome-accent)', fontWeight: 800 }}>Detail</button></td></tr>)}</tbody></table></div>}
    </div>
    <div className="pagination" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 16 }}><button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Sebelumnya</button><span>Halaman {page} / {totalPages}</span><button disabled={page >= totalPages || loading} onClick={() => setPage((value) => value + 1)}>Berikutnya</button></div>
    {selected && <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(4,8,15,.68)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 50 }}><div onClick={(event) => event.stopPropagation()} style={{ width: '100%', maxWidth: 680, background: 'var(--chrome-surface)', color: 'var(--chrome-text)', border: '1px solid var(--chrome-border)', borderRadius: 20, padding: 28, boxShadow: '0 30px 90px rgba(0,0,0,.35)' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}><div><p className="eyebrow" style={{ margin: 0 }}>EVENT AUDIT</p><h2 style={{ margin: '7px 0 4px' }}>{selected.action}</h2><p style={{ margin: 0, color: 'var(--chrome-muted)', fontSize: 12 }}>{formatDate(selected.createdAt)}</p></div><button onClick={() => setSelected(null)} style={{ border: 0, background: 'transparent', color: 'var(--chrome-muted)', fontSize: 24 }}>×</button></div><pre style={{ marginTop: 22, background: 'var(--chrome-surface-2)', border: '1px solid var(--chrome-border)', borderRadius: 12, padding: 16, overflow: 'auto', fontSize: 12, color: 'var(--chrome-text)' }}>{JSON.stringify(selected, null, 2)}</pre></div></div>}
  </main>;
}
