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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

function getSession() {
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
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function AuditPage() {
  const session = useMemo(() => getSession(), []);
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
    if (!session) {
      setLoading(false);
      setError('Your session is missing or expired. Please sign in again.');
      return;
    }

    if (session.role !== 'SUPERUSER') {
      setLoading(false);
      setError('Superuser access required.');
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);

    async function load() {
      setLoading(true);
      setError('');
      try {
        const qs = new URLSearchParams({ page: String(page), limit: '20' });
        if (action.trim()) qs.set('action', action.trim());
        if (entity.trim()) qs.set('entity', entity.trim());

        const response = await fetch(`${API_URL}/audit-logs?${qs.toString()}`, {
          headers: { Authorization: `Bearer ${session.token}` },
          signal: controller.signal,
          cache: 'no-store',
        });

        if (!response.ok) {
          if (response.status === 401) throw new Error('Session expired. Please sign in again.');
          if (response.status === 403) throw new Error('Superuser access required.');
          throw new Error(`Unable to load audit logs (HTTP ${response.status}).`);
        }

        const data = (await response.json()) as AuditResponse | AuditLog[];
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
        if (err instanceof DOMException && err.name === 'AbortError') {
          setError('The audit log request timed out. Check that the backend and database are running.');
        } else {
          setError(err instanceof Error ? err.message : 'Unable to load audit logs.');
        }
      } finally {
        window.clearTimeout(timeout);
        setLoading(false);
      }
    }

    void load();
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [session, page, action, entity]);

  if (!session) {
    return (
      <main className="workspace">
        <div className="workspace-head">
          <p className="eyebrow">SECURITY</p>
          <h1>Audit log</h1>
          <p>Your session is missing or expired.</p>
          <Link href="/" className="primary-button compact">Return to sign in</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="workspace">
      <div className="workspace-head" style={{ marginBottom: 26 }}>
        <div>
          <p className="eyebrow">SECURITY</p>
          <h1>Audit log</h1>
          <p>Review administrative and document activity captured by the system.</p>
        </div>
      </div>

      <div className="toolbar" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <input
          value={action}
          onChange={(event) => { setPage(1); setAction(event.target.value); }}
          placeholder="Filter action…"
          className="search"
          style={{ flex: '1 1 260px', minWidth: 220 }}
        />
        <input
          value={entity}
          onChange={(event) => { setPage(1); setEntity(event.target.value); }}
          placeholder="Filter entity…"
          className="search"
          style={{ flex: '1 1 220px', minWidth: 180 }}
        />
      </div>

      {error && <div className="inline-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="table-card">
        <div className="table-meta">
          <strong>{total} audit events</strong>
          <span>{loading ? 'Loading…' : `Page ${page} of ${totalPages}`}</span>
        </div>

        {loading ? (
          <div className="empty-state">
            <strong>Loading audit events…</strong>
            <p>Fetching the latest security activity.</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <strong>No audit events</strong>
            <p>No events match the current filters.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Time', 'Action', 'Entity', 'Actor', ''].map((heading, index) => (
                    <th key={`${heading}-${index}`} style={{ textAlign: 'left', padding: '15px 20px' }}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ padding: '16px 20px', fontSize: 12 }}>{formatDate(log.createdAt)}</td>
                    <td style={{ padding: '16px 20px', fontWeight: 800 }}>{log.action}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 700 }}>{log.entity}</div>
                      <div style={{ fontSize: 11, color: 'var(--chrome-muted)', marginTop: 4 }}>{log.entityId ?? '—'}</div>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: 12 }}>
                      {log.actor?.name ?? log.actor?.email ?? log.actorUserId ?? 'System'}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <button
                        onClick={() => setSelected(log)}
                        style={{ border: 0, background: 'transparent', color: 'var(--chrome-accent)', fontWeight: 800 }}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="pagination" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 16 }}>
        <button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Previous</button>
        <span>Page {page} / {totalPages}</span>
        <button disabled={page >= totalPages || loading} onClick={() => setPage((value) => value + 1)}>Next</button>
      </div>

      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(4,8,15,.68)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 50 }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{ width: '100%', maxWidth: 680, background: 'var(--chrome-surface)', color: 'var(--chrome-text)', border: '1px solid var(--chrome-border)', borderRadius: 20, padding: 28, boxShadow: '0 30px 90px rgba(0,0,0,.35)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}>
              <div>
                <p className="eyebrow" style={{ margin: 0 }}>AUDIT EVENT</p>
                <h2 style={{ margin: '7px 0 4px' }}>{selected.action}</h2>
                <p style={{ margin: 0, color: 'var(--chrome-muted)', fontSize: 12 }}>{formatDate(selected.createdAt)}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ border: 0, background: 'transparent', color: 'var(--chrome-muted)', fontSize: 24 }}>×</button>
            </div>
            <pre style={{ marginTop: 22, background: 'var(--chrome-surface-2)', border: '1px solid var(--chrome-border)', borderRadius: 12, padding: 16, overflow: 'auto', fontSize: 12, color: 'var(--chrome-text)' }}>
              {JSON.stringify(selected, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </main>
  );
}
