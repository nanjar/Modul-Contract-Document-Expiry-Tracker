'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../../../components/LanguageProvider';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
const token = () => (typeof window === 'undefined' ? '' : window.sessionStorage.getItem('expiry-tracker-token') ?? '');

export default function NewOfficeRequestPage() {
  const { lang } = useLanguage();
  const router = useRouter();
  const [type, setType] = useState('GENERAL');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requiredDate, setRequiredDate] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const id = lang === 'id';

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const response = await fetch(`${API}/office-automation/requests`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ type, title, description: description || undefined, requiredDate: requiredDate ? new Date(requiredDate).toISOString() : undefined, priority }),
      });
      if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.message || (id ? 'Gagal membuat request.' : 'Unable to create request.')); }
      const request = await response.json(); router.push(`/office/requests/${request.id}`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to create request.'); }
    finally { setSaving(false); }
  };

  return <main style={{minHeight:'100vh',background:'#f7f9fc',padding:'48px clamp(20px,5vw,72px)',fontFamily:'Inter,system-ui,sans-serif',color:'#0f172a'}}><div style={{maxWidth:900,margin:'auto'}}><Link href="/office" style={{color:'#64748b',textDecoration:'none',fontSize:13}}>← {id?'Operasional Kantor':'Office Operations'}</Link><h1 style={{fontSize:34,margin:'22px 0 8px'}}>{id?'Buat Request':'Create Request'}</h1><p style={{color:'#64748b'}}>{id?'Ajukan kebutuhan operasional baru.':'Submit a new operational request.'}</p>{error&&<div style={{margin:'18px 0',padding:12,borderRadius:10,background:'#fef2f2',color:'#b91c1c'}}>{error}</div>}<form onSubmit={submit} style={{marginTop:24,background:'#fff',border:'1px solid #e2e8f0',borderRadius:18,padding:24,display:'grid',gap:16}}><label>Type<select value={type} onChange={e=>setType(e.target.value)} style={field}><option>GENERAL</option><option>LEAVE</option><option>ATTENDANCE</option><option>LATE</option><option>WFH</option><option>OVERTIME</option><option>REIMBURSEMENT</option><option>BUSINESS_TRIP</option><option>MEETING</option></select></label><label>{id?'Judul':'Title'}<input required maxLength={200} value={title} onChange={e=>setTitle(e.target.value)} style={field}/></label><label>{id?'Deskripsi':'Description'}<textarea maxLength={5000} value={description} onChange={e=>setDescription(e.target.value)} style={{...field,minHeight:120,resize:'vertical'}}/></label><label>{id?'Tanggal dibutuhkan':'Required date'}<input type="datetime-local" value={requiredDate} onChange={e=>setRequiredDate(e.target.value)} style={field}/></label><label>Priority<select value={priority} onChange={e=>setPriority(e.target.value)} style={field}><option>NORMAL</option><option>LOW</option><option>HIGH</option><option>URGENT</option></select></label><div style={{display:'flex',justifyContent:'flex-end',gap:10}}><Link href="/office" style={{padding:'11px 16px',border:'1px solid #e2e8f0',borderRadius:10,textDecoration:'none',color:'#475569'}}>Cancel</Link><button disabled={saving} style={{padding:'11px 16px',border:0,borderRadius:10,background:'#111827',color:'#fff',fontWeight:750}}>{saving?'Saving…':id?'Simpan Request':'Create Request'}</button></div></form></div></main>;
}

const field: React.CSSProperties = { display:'block',width:'100%',marginTop:7,padding:'11px 12px',border:'1px solid #dbe3ed',borderRadius:10,background:'#fff',font:'inherit',boxSizing:'border-box' };
