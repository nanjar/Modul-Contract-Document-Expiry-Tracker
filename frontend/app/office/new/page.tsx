'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../../../components/LanguageProvider';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
const token = () => typeof window === 'undefined' ? '' : sessionStorage.getItem('expiry-tracker-token') ?? '';

type RequestType = 'GENERAL'|'LEAVE'|'ATTENDANCE'|'LATE'|'WFH'|'OVERTIME'|'REIMBURSEMENT'|'BUSINESS_TRIP'|'MEETING'|'ASSET'|'ANNOUNCEMENT';
const types: Array<[RequestType,string,string]> = [
  ['LEAVE','Cuti','Leave'], ['ATTENDANCE','Attendance','Attendance'], ['LATE','Izin terlambat','Late arrival'],
  ['OVERTIME','Lembur','Overtime'], ['WFH','WFH','Work from home'], ['REIMBURSEMENT','Reimbursement','Reimbursement'],
  ['BUSINESS_TRIP','Dinas luar','Business trip'], ['MEETING','Booking meeting room','Meeting room'], ['ASSET','Asset request','Asset request'],
  ['ANNOUNCEMENT','Pengumuman','Announcement'], ['GENERAL','General','General'],
];

export default function NewOfficeRequestPage() {
  const { lang } = useLanguage(); const id = lang === 'id'; const router = useRouter();
  const [type, setType] = useState<RequestType>('GENERAL');
  const [title, setTitle] = useState(''); const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('NORMAL'); const [startDate, setStartDate] = useState(''); const [endDate, setEndDate] = useState(''); const [requiredDate, setRequiredDate] = useState('');
  const [leaveType, setLeaveType] = useState('Annual'); const [action, setAction] = useState('CHECK_IN'); const [estimatedArrival, setEstimatedArrival] = useState('');
  const [location, setLocation] = useState(''); const [reason, setReason] = useState(''); const [startTime, setStartTime] = useState(''); const [endTime, setEndTime] = useState('');
  const [amount, setAmount] = useState(''); const [expenseDescription, setExpenseDescription] = useState(''); const [destination, setDestination] = useState(''); const [pic, setPic] = useState('');
  const [roomId, setRoomId] = useState(''); const [participants, setParticipants] = useState(''); const [assetName, setAssetName] = useState(''); const [saving, setSaving] = useState(false); const [error, setError] = useState('');

  const field = (label:string, value:string, setter:(v:string)=>void, opts?:{type?:string;required?:boolean;placeholder?:string}) => (
    <label className="f-label">{label}<input className="f-input" type={opts?.type ?? 'text'} value={value} required={opts?.required} placeholder={opts?.placeholder} onChange={e=>setter(e.target.value)} /></label>
  );

  async function submit(e:FormEvent) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const metadata: Record<string, unknown> = {};
      if (type === 'LEAVE') { metadata.leaveType = leaveType; metadata.reason = reason; }
      if (type === 'ATTENDANCE') metadata.action = action;
      if (type === 'LATE') { metadata.estimatedArrival = estimatedArrival; metadata.reason = reason; }
      if (type === 'WFH') { metadata.location = location; metadata.reason = reason; }
      if (type === 'OVERTIME') { metadata.startTime = startTime; metadata.endTime = endTime; metadata.reason = reason; }
      if (type === 'REIMBURSEMENT') { metadata.amount = Number(amount); metadata.description = expenseDescription; }
      if (type === 'BUSINESS_TRIP') { metadata.destination = destination; metadata.pic = pic; }
      if (type === 'MEETING') { metadata.roomId = roomId; metadata.participants = participants; }
      if (type === 'ASSET') { metadata.assetName = assetName; metadata.reason = reason; }
      if (type === 'ANNOUNCEMENT') metadata.message = description;

      const toIso = (value:string) => value ? new Date(value).toISOString() : undefined;
      const response = await fetch(`${API}/office-automation/requests`, {
        method:'POST',
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${token()}`},
        body:JSON.stringify({ type, title, description:description||undefined, startDate:toIso(startDate), endDate:toIso(endDate), requiredDate:toIso(requiredDate), priority, metadata }),
      });
      if (!response.ok) {
        const body = await response.json().catch(()=>null);
        throw new Error(Array.isArray(body?.message) ? body.message.join(', ') : body?.message || (id?'Gagal membuat request.':'Unable to create request.'));
      }
      const created = await response.json();
      router.push(`/office/requests/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : (id?'Gagal membuat request.':'Unable to create request.'));
    } finally { setSaving(false); }
  }

  return (
    <main className="office-new"><style>{`.office-new{min-height:calc(100vh - 64px);padding:34px clamp(18px,4vw,52px);color:var(--chrome-text)}.wrap{max-width:900px;margin:0 auto}.back{color:var(--chrome-muted);text-decoration:none;font-size:11px}.head{margin:18px 0 20px}.eyebrow{margin:0 0 6px;color:var(--chrome-muted);font-size:10px;font-weight:850;letter-spacing:.15em}.head h1{margin:0;font-size:30px}.head p{margin:7px 0 0;color:var(--chrome-muted);font-size:12px}.form{padding:22px;border:1px solid var(--chrome-border);border-radius:18px;background:var(--chrome-surface);display:grid;gap:15px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}.f-label{display:grid;gap:7px;color:var(--chrome-text);font-size:10px;font-weight:800}.f-input,.f-select,.f-textarea{width:100%;box-sizing:border-box;border:1px solid var(--chrome-border);border-radius:10px;background:var(--chrome-surface-2);color:var(--chrome-text);padding:11px 12px;font:inherit;font-size:11px}.f-textarea{min-height:120px;resize:vertical}.section{padding:14px;border:1px solid var(--chrome-border);border-radius:13px;display:grid;gap:13px}.actions{display:flex;justify-content:flex-end;gap:9px}.cancel{padding:10px 13px;border:1px solid var(--chrome-border);border-radius:9px;color:var(--chrome-text);text-decoration:none;font-size:10px;font-weight:800}.submit{padding:10px 14px;border:0;border-radius:9px;background:#4c6fff;color:#fff;font-size:10px;font-weight:850;cursor:pointer}.submit:disabled{opacity:.6;cursor:wait}.error{padding:11px 13px;border-radius:10px;background:#3a171b;border:1px solid #6f2b32;color:#ffabb2;font-size:11px}@media(max-width:650px){.office-new{padding:24px 14px}.head h1{font-size:25px}.grid{grid-template-columns:1fr}.form{padding:17px}}`}</style>
      <div className="wrap">
        <Link href="/office" className="back">← {id?'Kembali ke Office Automation':'Back to Office Automation'}</Link>
        <header className="head"><p className="eyebrow">OFFICE AUTOMATION</p><h1>{id?'Buat request baru':'Create a new request'}</h1><p>{id?'Form mengikuti kebutuhan workflow HR lama dengan PostgreSQL sebagai source of truth.':'Submit an operational request using the legacy HR workflow fields.'}</p></header>
        {error && <div className="error">{error}</div>}
        <form className="form" onSubmit={submit}>
          <div className="grid">
            <label className="f-label">{id?'Jenis request':'Request type'}<select className="f-select" value={type} onChange={e=>setType(e.target.value as RequestType)}>{types.map(t=><option key={t[0]} value={t[0]}>{id?t[1]:t[2]}</option>)}</select></label>
            <label className="f-label">Priority<select className="f-select" value={priority} onChange={e=>setPriority(e.target.value)}><option>LOW</option><option>NORMAL</option><option>HIGH</option><option>URGENT</option></select></label>
          </div>
          {field(id?'Judul':'Title',title,setTitle,{required:true,placeholder:id?'Contoh: Pengajuan cuti tahunan':'Example: Annual leave request'})}
          {type==='LEAVE' && <div className="section"><strong>{id?'Detail cuti':'Leave details'}</strong><div className="grid">{field(id?'Jenis cuti':'Leave type',leaveType,setLeaveType,{required:true})}{field(id?'Alasan':'Reason',reason,setReason,{required:true})}</div></div>}
          {type==='ATTENDANCE' && <div className="section"><strong>Attendance</strong><label className="f-label">Action<select className="f-select" value={action} onChange={e=>setAction(e.target.value)}><option value="CHECK_IN">Check-in</option><option value="CHECK_OUT">Check-out</option></select></label></div>}
          {type==='LATE' && <div className="section"><strong>{id?'Izin terlambat':'Late arrival'}</strong><div className="grid">{field(id?'Estimasi jam datang':'Estimated arrival',estimatedArrival,setEstimatedArrival,{required:true,placeholder:'09:30'})}{field(id?'Alasan':'Reason',reason,setReason,{required:true})}</div></div>}
          {type==='WFH' && <div className="section"><strong>Work from home</strong><div className="grid">{field(id?'Lokasi':'Location',location,setLocation,{required:true})}{field(id?'Alasan':'Reason',reason,setReason,{required:true})}</div></div>}
          {type==='OVERTIME' && <div className="section"><strong>{id?'Detail lembur':'Overtime details'}</strong><div className="grid">{field(id?'Jam mulai':'Start time',startTime,setStartTime,{required:true,placeholder:'18:00'})}{field(id?'Jam selesai':'End time',endTime,setEndTime,{required:true,placeholder:'20:00'})}</div>{field(id?'Alasan':'Reason',reason,setReason,{required:true})}</div>}
          {type==='REIMBURSEMENT' && <div className="section"><strong>Reimbursement</strong><div className="grid">{field(id?'Nominal':'Amount',amount,setAmount,{type:'number',required:true,placeholder:'150000'})}{field(id?'Keterangan biaya':'Expense description',expenseDescription,setExpenseDescription,{required:true})}</div></div>}
          {type==='BUSINESS_TRIP' && <div className="section"><strong>{id?'Dinas luar':'Business trip'}</strong><div className="grid">{field(id?'Tujuan':'Destination',destination,setDestination,{required:true})}{field('PIC',pic,setPic,{required:true})}</div></div>}
          {type==='MEETING' && <div className="section"><strong>{id?'Booking meeting room':'Meeting room booking'}</strong><div className="grid">{field(id?'Nama/ID room':'Room name/ID',roomId,setRoomId,{required:true})}{field(id?'Peserta':'Participants',participants,setParticipants,{required:true,placeholder:'employee@example.com, employee2@example.com'})}</div></div>}
          {type==='ASSET' && <div className="section"><strong>Asset request</strong><div className="grid">{field(id?'Nama asset':'Asset name',assetName,setAssetName,{required:true})}{field(id?'Alasan':'Reason',reason,setReason,{required:true})}</div></div>}
          <label className="f-label">{type==='ANNOUNCEMENT'?(id?'Isi pengumuman':'Announcement message'):(id?'Deskripsi / catatan':'Description / notes')}<textarea className="f-textarea" maxLength={5000} value={description} onChange={e=>setDescription(e.target.value)} required={type==='ANNOUNCEMENT'} /></label>
          <div className="grid"><label className="f-label">{id?'Mulai':'Start'}<input className="f-input" type="datetime-local" value={startDate} onChange={e=>setStartDate(e.target.value)} required={['LEAVE','WFH','OVERTIME','BUSINESS_TRIP','MEETING'].includes(type)} /></label><label className="f-label">{id?'Selesai':'End'}<input className="f-input" type="datetime-local" value={endDate} onChange={e=>setEndDate(e.target.value)} required={['LEAVE','BUSINESS_TRIP','MEETING'].includes(type)} /></label></div>
          <label className="f-label">{id?'Tanggal dibutuhkan':'Required date'}<input className="f-input" type="datetime-local" value={requiredDate} onChange={e=>setRequiredDate(e.target.value)} /></label>
          <div className="actions"><Link className="cancel" href="/office">{id?'Batal':'Cancel'}</Link><button className="submit" disabled={saving}>{saving?(id?'Menyimpan…':'Saving…'):(id?'Buat request':'Create request')}</button></div>
        </form>
      </div>
    </main>
  );
}
