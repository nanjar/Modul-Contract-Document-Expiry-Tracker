'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../../components/LanguageProvider';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
const auth = () => ({ Authorization: `Bearer ${typeof window === 'undefined' ? '' : sessionStorage.getItem('expiry-tracker-token') ?? ''}` });

type RequestItem = { id: string; requestNumber: string; title: string; type: string; priority: string; status: string; requestedAt: string; requiredDate?: string | null; requester?: { name: string } };

const labels: Record<string, string> = { PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected', CANCELLED: 'Cancelled', IN_PROGRESS: 'In progress', COMPLETED: 'Completed' };

export default function OfficeRequestsPage() {
  const { lang } = useLanguage();
  const id = lang === 'id';
  const [items, setItems] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch(`${API}/office-automation/requests?all=true`, { headers: auth(), cache: 'no-store' });
      if (!response.ok) throw new Error(id ? 'Gagal memuat request.' : 'Unable to load requests.');
      setItems(await response.json());
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load requests.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => items.filter(item => (filter === 'ALL' || item.status === filter) && (!query.trim() || `${item.requestNumber} ${item.title} ${item.type} ${item.requester?.name ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()))), [items, filter, query]);
  const date = (value?: string | null) => value ? new Intl.DateTimeFormat(id ? 'id-ID' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : '—';

  return <main className="office-page"><style>{`
    .office-page{min-height:calc(100vh - 64px);padding:34px clamp(18px,4vw,52px);color:var(--chrome-text)}.office-wrap{max-width:1440px;margin:0 auto}.office-head{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:24px}.office-eyebrow{margin:0 0 6px;color:var(--chrome-muted);font-size:10px;font-weight:850;letter-spacing:.16em}.office-head h1{margin:0;font-size:30px;letter-spacing:-.8px}.office-head p:last-child{margin:7px 0 0;color:var(--chrome-muted);font-size:12px}.office-primary{display:inline-flex;align-items:center;gap:8px;padding:11px 15px;border-radius:11px;background:#4c6fff;color:#fff;text-decoration:none;font-size:12px;font-weight:800;box-shadow:0 12px 26px rgba(76,111,255,.2)}.office-toolbar{display:flex;gap:10px;align-items:center;margin-bottom:16px}.office-search,.office-select{height:40px;border:1px solid var(--chrome-border);background:var(--chrome-surface);color:var(--chrome-text);border-radius:10px;padding:0 12px;outline:0;font-size:12px}.office-search{flex:1;min-width:180px}.office-select{width:170px}.office-card{border:1px solid var(--chrome-border);border-radius:16px;background:var(--chrome-surface);overflow:hidden}.office-table{width:100%;border-collapse:collapse}.office-table th,.office-table td{padding:14px 16px;text-align:left;border-bottom:1px solid var(--chrome-border);font-size:12px}.office-table th{color:var(--chrome-muted);font-size:10px;text-transform:uppercase;letter-spacing:.08em;background:var(--chrome-surface-2)}.office-table td{color:var(--chrome-text)}.office-table tr:last-child td{border-bottom:0}.office-title{font-weight:800}.office-sub{margin-top:4px;color:var(--chrome-muted);font-size:10px}.office-link{color:#9eacff;text-decoration:none}.office-pill{display:inline-flex;padding:5px 8px;border-radius:999px;background:rgba(76,111,255,.12);color:#9eacff;font-size:10px;font-weight:800}.office-priority{color:var(--chrome-muted);font-weight:750}.office-error,.office-empty{padding:30px;text-align:center;color:var(--chrome-muted);font-size:12px}.office-error{color:#ffabb2;background:rgba(115,30,38,.18)}@media(max-width:800px){.office-head{align-items:flex-start;flex-direction:column}.office-toolbar{flex-direction:column;align-items:stretch}.office-select{width:auto}.office-table th:nth-child(4),.office-table td:nth-child(4),.office-table th:nth-child(5),.office-table td:nth-child(5){display:none}}@media(max-width:560px){.office-page{padding:24px 14px}.office-head h1{font-size:25px}.office-table th,.office-table td{padding:11px 9px}.office-table th:nth-child(3),.office-table td:nth-child(3){display:none}}
  `}</style><div className="office-wrap"><header className="office-head"><div><p className="office-eyebrow">OFFICE AUTOMATION</p><h1>{id ? 'Request operasional' : 'Office requests'}</h1><p>{id ? 'Kelola seluruh request yang dapat Anda akses.' : 'Manage operational requests within your permitted scope.'}</p></div><Link href="/office/new" className="office-primary">＋ {id ? 'Request baru' : 'New request'}</Link></header>
    <div className="office-toolbar"><input className="office-search" value={query} onChange={e => setQuery(e.target.value)} placeholder={id ? 'Cari nomor, judul, tipe, pemohon…' : 'Search number, title, type, requester…'} /><select className="office-select" value={filter} onChange={e => setFilter(e.target.value)}><option value="ALL">{id ? 'Semua status' : 'All statuses'}</option>{Object.keys(labels).map(status => <option key={status} value={status}>{labels[status]}</option>)}</select></div>
    <section className="office-card">{error ? <div className="office-error">{error}<br /><button onClick={() => void load()} style={{marginTop:10,padding:'8px 12px',borderRadius:8,border:'1px solid var(--chrome-border)',background:'var(--chrome-surface)',color:'var(--chrome-text)'}}>{id?'Coba lagi':'Retry'}</button></div> : loading ? <div className="office-empty">Loading…</div> : filtered.length === 0 ? <div className="office-empty">{id ? 'Belum ada request.' : 'No requests found.'}</div> : <div style={{overflowX:'auto'}}><table className="office-table"><thead><tr><th>Request</th><th>Requester</th><th>Status</th><th>Priority</th><th>Required</th></tr></thead><tbody>{filtered.map(item => <tr key={item.id}><td><Link href={`/office/requests/${item.id}`} className="office-link"><div className="office-title">{item.title}</div><div className="office-sub">{item.requestNumber} · {item.type}</div></Link></td><td>{item.requester?.name ?? '—'}</td><td><span className="office-pill">{labels[item.status] ?? item.status}</span></td><td className="office-priority">{item.priority}</td><td>{date(item.requiredDate)}</td></tr>)}</tbody></table></div>}</section></div></main>;
}
