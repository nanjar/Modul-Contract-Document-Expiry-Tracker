'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../components/LanguageProvider';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
const token = () => (typeof window === 'undefined' ? '' : window.sessionStorage.getItem('expiry-tracker-token') ?? '');

type RequestItem = { id: string; requestNumber: string; title: string; type: string; priority: string; status: string };
type Task = { id: string; title: string; status: string; priority: string; dueDate?: string | null; request?: { requestNumber: string } };
type Summary = { pendingRequests: number; pendingApprovals: number; openTasks: number; overdueTasks: number; myRequests: number; myTasks: number };

const copy = {
  en: { back: 'Command center', eyebrow: 'OFFICE AUTOMATION', title: 'Office Operations', subtitle: 'Requests, approvals and tasks in one operational workspace.', requests: 'Requests', tasks: 'My Tasks', newRequest: 'New request', pending: 'Pending requests', approvals: 'Pending approvals', open: 'Open tasks', overdue: 'Overdue tasks', mine: 'My active requests', assigned: 'My active tasks', view: 'View', empty: 'Nothing needs attention right now.', loadFailed: 'Unable to load office data.', session: 'Your session has expired.' },
  id: { back: 'Pusat kendali', eyebrow: 'OFFICE AUTOMATION', title: 'Operasional Kantor', subtitle: 'Request, approval, dan task dalam satu workspace operasional.', requests: 'Request', tasks: 'Task Saya', newRequest: 'Request baru', pending: 'Request pending', approvals: 'Approval pending', open: 'Task terbuka', overdue: 'Task terlambat', mine: 'Request aktif saya', assigned: 'Task aktif saya', view: 'Lihat', empty: 'Tidak ada yang perlu ditindaklanjuti saat ini.', loadFailed: 'Gagal memuat data office.', session: 'Sesi Anda telah berakhir.' }
} as const;

const formatDate = (value: string | null | undefined, lang: 'en' | 'id') => value ? new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : '—';

export default function OfficePage() {
  const { lang } = useLanguage();
  const t = copy[lang];
  const [summary, setSummary] = useState<Summary | null>(null);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const headers = { Authorization: `Bearer ${token()}` };
        const [dashboard, requestResponse, taskResponse] = await Promise.all([
          fetch(`${API}/office-automation/dashboard`, { headers, cache: 'no-store' }),
          fetch(`${API}/office-automation/requests`, { headers, cache: 'no-store' }),
          fetch(`${API}/office-automation/tasks`, { headers, cache: 'no-store' }),
        ]);
        if ([dashboard, requestResponse, taskResponse].some((response) => response.status === 401)) throw new Error(t.session);
        if (![dashboard, requestResponse, taskResponse].every((response) => response.ok)) throw new Error(t.loadFailed);
        const [dashboardData, requestData, taskData] = await Promise.all([dashboard.json(), requestResponse.json(), taskResponse.json()]);
        setSummary(dashboardData); setRequests(requestData); setTasks(taskData);
      } catch (e) { setError(e instanceof Error ? e.message : t.loadFailed); }
      finally { setLoading(false); }
    };
    run();
  }, [t.loadFailed, t.session]);

  return <main className="office"><style>{`
    .office{min-height:100vh;background:#f7f9fc;color:#0f172a;padding:48px clamp(20px,5vw,72px);font-family:Inter,system-ui,sans-serif}.office-head{max-width:1400px;margin:0 auto 30px;display:flex;justify-content:space-between;align-items:flex-end;gap:20px}.office-head h1{font-size:36px;letter-spacing:-1.2px;margin:6px 0}.office-head p:not(.eyebrow){color:#64748b;margin:0}.back{display:inline-block;color:#64748b;text-decoration:none;font-size:13px;margin-bottom:18px}.eyebrow{font-size:11px;letter-spacing:.16em;font-weight:800;color:#64748b;margin:0}.button{background:#111827;color:#fff;text-decoration:none;padding:12px 17px;border-radius:12px;font-weight:750}.cards{max-width:1400px;margin:0 auto 24px;display:grid;grid-template-columns:repeat(6,1fr);gap:12px}.card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:18px}.card span{font-size:12px;color:#64748b}.card strong{display:block;font-size:28px;margin-top:10px}.content{max-width:1400px;margin:auto;display:grid;grid-template-columns:1.25fr 1fr;gap:16px}.panel{background:#fff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden}.panel-head{padding:18px 20px;border-bottom:1px solid #eef2f7;display:flex;justify-content:space-between}.panel-body{padding:0 20px}.row{display:grid;grid-template-columns:1.4fr .8fr .6fr .7fr auto;gap:12px;align-items:center;padding:15px 0;border-bottom:1px solid #eef2f7;font-size:13px}.row:last-child{border-bottom:0}.muted{color:#64748b}.pill,.status{display:inline-flex;padding:5px 8px;border-radius:999px;font-size:11px;font-weight:750}.pill{background:#f1f5f9;color:#475569}.status{background:#eff6ff;color:#1d4ed8}.overdue{background:#fef2f2;color:#dc2626}.empty{padding:40px 10px;text-align:center;color:#64748b;font-size:13px}@media(max-width:1100px){.cards{grid-template-columns:repeat(3,1fr)}.content{grid-template-columns:1fr}}@media(max-width:700px){.office{padding:28px 16px}.office-head{align-items:flex-start;flex-direction:column}.cards{grid-template-columns:repeat(2,1fr)}.row{grid-template-columns:1fr 1fr}.row>*:nth-child(n+3){display:none}}
  `}</style>
    <header className="office-head"><div><Link href="/" className="back">← {t.back}</Link><p className="eyebrow">{t.eyebrow}</p><h1>{t.title}</h1><p>{t.subtitle}</p></div><Link href="/office/new" className="button">＋ {t.newRequest}</Link></header>
    {error && <div style={{maxWidth:1400,margin:'0 auto 14px',padding:12,borderRadius:12,background:'#fef2f2',color:'#b91c1c',border:'1px solid #fecaca',fontSize:13}}>{error}</div>}
    <section className="cards">{[[t.pending,summary?.pendingRequests],[t.approvals,summary?.pendingApprovals],[t.open,summary?.openTasks],[t.overdue,summary?.overdueTasks],[t.mine,summary?.myRequests],[t.assigned,summary?.myTasks]].map(([label,value])=><div className="card" key={String(label)}><span>{label}</span><strong>{loading?'—':value}</strong></div>)}</section>
    <section className="content"><div className="panel"><div className="panel-head"><strong>{t.requests}</strong><span className="muted">{requests.length}</span></div><div className="panel-body">{loading?<div className="empty">Loading…</div>:requests.length?requests.slice(0,10).map((item)=><div className="row" key={item.id}><div><strong>{item.title}</strong><div className="muted">{item.requestNumber}</div></div><span>{item.type}</span><span className="pill">{item.priority}</span><span className="status">{item.status}</span><Link href={`/office/requests/${item.id}`} className="muted">{t.view} →</Link></div>):<div className="empty">{t.empty}</div>}</div></div>
      <div className="panel"><div className="panel-head"><strong>{t.tasks}</strong><span className="muted">{tasks.length}</span></div><div className="panel-body">{loading?<div className="empty">Loading…</div>:tasks.length?tasks.slice(0,10).map((task)=><div className="row" key={task.id}><div><strong>{task.title}</strong><div className="muted">{task.request?.requestNumber ?? '—'}</div></div><span className="pill">{task.priority}</span><span className={`status ${task.dueDate && new Date(task.dueDate)<new Date() && task.status!=='COMPLETED'?'overdue':''}`}>{task.status}</span><span>{formatDate(task.dueDate,lang)}</span><span>→</span></div>):<div className="empty">{t.empty}</div>}</div></div>
    </section>
  </main>;
}
